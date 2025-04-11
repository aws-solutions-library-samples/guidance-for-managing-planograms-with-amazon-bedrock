from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
from flask_caching import Cache
import os
from werkzeug.utils import secure_filename
from util import planogram_compliance, planogram_generation, planogram_rules
import secrets
import qrcode
import io
import time
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
import json
from datetime import datetime, timedelta
from time import sleep
import requests
from urllib.parse import urlencode
from jose import jwk, jwt
from jose.utils import base64url_decode
import cv2

application = Flask(__name__, static_folder='static')
cache = Cache(application, config={'CACHE_TYPE': 'null'})
application.secret_key = secrets.token_urlsafe(32)
# Configure upload folder
UPLOAD_FOLDER = 'static/uploads'
IMAGES_FOLDER = 'static/images'
SHELF_FOLDER = 'static/shelfs'
bucket_name = planogram_generation.readParameterValueFromSSM('/planogram/s3/bucket')
application.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

valid_secrets = set()

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

table_name = planogram_generation.readParameterValueFromSSM('/planogram/dynamodb/qrcodes')

planogram_generation.genenate_product_metadata()

planogram_rules.write_data_to_json(planogram_rules.read_planogram_rules(), 'planogramRules.json')

cannedInstructions = planogram_rules.read_planogram_instructions()

with open('skewMetadata.json', 'r') as f:
    products = json.load(f)

with open('planogramRules.json', 'r') as f:
    planogramRules = json.load(f)

planogram_rules.sync_s3_folder_with_local_folder(bucket_name, IMAGES_FOLDER, IMAGES_FOLDER)
planogram_rules.sync_s3_folder_with_local_folder(bucket_name, SHELF_FOLDER, UPLOAD_FOLDER)

#upload file in S3 bucket
def upload_file_to_s3(filename, bucket_name, object_name):
    try:
        with open(filename, 'rb') as file:
            s3_client.upload_fileobj(file, bucket_name, object_name)
        print(f"File uploaded successfully to {bucket_name}/{object_name}")
    except Exception as e:
        print(f"Error uploading file: {e}")

#download file from S3 bucket
def download_file_from_s3(bucket_name, object_name, local_file_path):
    try:
        s3_client.download_file(bucket_name, object_name, local_file_path)
        print(f"File downloaded succesfsfully from {bucket_name}/{object_name}")
    except Exception as e:
        print(f"Error downloading file: {e}")

def create_table_if_not_exists(table_name):
    try:
        table = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {
                    'AttributeName': 'secret',
                    'KeyType': 'HASH'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'secret',
                    'AttributeType': 'S'
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        table.meta.client.get_waiter('table_exists').wait(TableName=table_name)
        print(f"Table {table_name} created successfully.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print(f"Table {table_name} already exists.")
        else:
            print(f"Unexpected error: {e}")

def generate_unique_secret():
    return secrets.token_urlsafe(32)

def store_secret(secret):
    create_table_if_not_exists(table_name)
    table = dynamodb.Table(table_name)
    expiration = int(time.time()) + (int(planogram_generation.readParameterValueFromSSM('/planogram/web/sessiontimeout')))
    table.put_item(
        Item={
            'secret': secret,
            'expiration': expiration,
            'used': False
        }
    )

def delete_all_old_secrets(table):
    current_time = int(time.time())
    response = table.scan(
        FilterExpression=Attr('expiration').lt(current_time)
    )

    # Delete each item found
    for item in response['Items']:
        table.delete_item(
            Key={
                'secret': item['secret']
            }
        )

def expire_all_old_secrets(table):
    current_time = int(time.time())
    response = table.scan(
        FilterExpression=Attr('expiration').lt(current_time) &
        Attr('used').eq(False)
    )

    # Update each item found
    for item in response['Items']:
        table.update_item(
            Key={
                'secret': item['secret']
            },
            UpdateExpression='SET used = :val',
            ExpressionAttributeValues={
                ':val': True
            }
        )

def validate_secret(secret):
    table = dynamodb.Table(table_name)
    # Scan the table for items with expiration_time less than current time
    expire_all_old_secrets(table)
    response = table.get_item(Key={'secret': secret})
    if 'Item' in response:
        item = response['Item']
        if item['expiration'] > int(time.time()):
            delete_all_old_secrets(table)
            return True
        else:
            table.update_item(
                Key={'secret': secret},
                UpdateExpression="SET used = :val",
                ExpressionAttributeValues={':val': True}
            )
    delete_all_old_secrets(table)
    return False

#read the planogram_image_map from dynamodb table
def read_planogram_image_map():
    image_map = {}
    table = dynamodb.Table(planogram_generation.readParameterValueFromSSM('/planogram/dynamodb/planogram_templates'))
    response = table.scan()
    data = response['Items']
    for item in data:
        image_map[item['planogramName']] = item['fileLocation']
        download_file_from_s3(bucket_name, item['fileLocation'], item['fileLocation'])
    return image_map

planogram_image_map = read_planogram_image_map()

@application.before_request
def make_session_permanent():
    session.permanent = True

# write a function to retrieve data from dynamodb using an attribute value
@application.route('/fetch_shelf_images', methods=['POST'])
def fetch_shelf_images():
    #fetch data from a dynamodb table based on an attribute value
    # print("request.json['planogramName']: ", request.json['planogramName'])
    planogram_name = request.json['planogramName']
    # print("planogram_name: ", planogram_name)
    table = dynamodb.Table(planogram_generation.readParameterValueFromSSM('/planogram/dynamodb/shelf_images'))
    response = table.scan(
        FilterExpression=Attr('planogramName').eq(f'{planogram_name}')
    )
    # print("data: ", response['Items'])
    return response['Items']

@application.route('/login')
def login():
    target_url = request.url.replace('/login', '/redirect')
    
    # Create the full URL with the secret
    full_url = f"{target_url}"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(full_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to a BytesIO object
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    # Return the image file
    return send_file(img_io, mimetype='image/png')

def exchange_code_for_tokens(code):
    CLIENT_ID = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitoclientid')
    CLIENT_SECRET = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitosecretkey')
    COGNITO_DOMAIN = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitodomain')
    REDIRECT_URI = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitoredirurl')

    token_endpoint = f"{COGNITO_DOMAIN}/oauth2/token"
    
    payload = {
        'grant_type': 'authorization_code',
        'client_id': CLIENT_ID,
        'code': code,
        'redirect_uri': REDIRECT_URI,
    }
    
    response = requests.post(
        token_endpoint,
        data=payload,
        timeout=300,
        auth=(CLIENT_ID, CLIENT_SECRET)
    )
    
    if response.status_code != 200:
        raise Exception("Failed to exchange code for tokens")
    
    return response.json()

def verify_token(token):
    CLIENT_ID = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitoclientid')
    # Decode the token header
    headers = jwt.get_unverified_headers(token)
    kid = headers['kid']
    
    # Download the public keys from Cognito
    jwks_url = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitojwksurl')
    jwks = requests.get(jwks_url, timeout=300).json()
    
    # Find the key that matches the kid in the token header
    key = next((k for k in jwks['keys'] if k['kid'] == kid), None)
    if not key:
        raise Exception("Public key not found")
    
    # Construct the public key
    public_key = jwk.construct(key)
    
    # Verify the token
    message, encoded_signature = token.rsplit('.', 1)
    decoded_signature = base64url_decode(encoded_signature.encode('utf-8'))
    
    if not public_key.verify(message.encode('utf8'), decoded_signature):
        raise Exception("Signature verification failed")
    
    # Verify the claims
    claims = jwt.get_unverified_claims(token)

    if claims['aud'] != CLIENT_ID:
        raise Exception("Token was not issued for this audience")
    
    if time.time() > claims['exp']:
        raise Exception("Token has expired")
    
    return claims

@application.route('/callback')
def callback():
    code = request.args.get('code')
    
    if not code:
        return "No code provided", 400
    
    # Validate and exchange the code for tokens
    try:
        tokens = exchange_code_for_tokens(code)
        id_token = tokens['id_token']
        access_token = tokens['access_token']
        
        # Verify the tokens
        claims = verify_token(id_token)
        # Store the tokens in the session or handle as needed
        session['id_token'] = id_token
        session['access_token'] = access_token
        
        return render_template('redirect.html', secret=request.args['code'])
    except Exception as e:
        print(e)
        return render_template('index.html')

@application.route('/healthcheck')
def health_check():
    return jsonify({"status": "healthy"}), 200

@application.route('/', methods=['GET', 'POST'])
def index():
    # print(f"session: {session}, request: {request}")
    # if 'secret' not in request.args:
    #     if 'secret' not in request.form:
    #         cognito_login_url = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitologinurl')
    #         print(f"cognito_login_url: {cognito_login_url}")
    #         return redirect(cognito_login_url)
    #     else:
    #         session['request_key'] = request.form.get('secret')
    # else:
    #     session['request_key'] = request.args.get('secret')

    # secret = session['request_key']
    # if 'code' not in request.args:
    #     cognito_login_url = planogram_generation.readParameterValueFromSSM('/planogram/web/cognitologinurl')
    #     return redirect(cognito_login_url)
    # print("Valid secret")
    planogram_image_map = read_planogram_image_map()
    session['planogram_image_map'] = planogram_image_map
    # print(planogramRules)
    # print(products)
    planogram_generation.genenate_product_metadata()

    planogram_rules.write_data_to_json(planogram_rules.read_planogram_rules(), 'planogramRules.json')

    cannedInstructions = planogram_rules.read_planogram_instructions()
    llmModels = planogram_rules.read_llm_models()
    with open('skewMetadata.json', 'r') as f:
        products = json.load(f)

    with open('planogramRules.json', 'r') as f:
        planogramRules = json.load(f)

    return render_template('index.html', planogram_options=planogram_image_map.keys(), products=products, planogramRules=planogramRules['planogramRules'], cannedInstructions=cannedInstructions, llmModels=llmModels)

from PIL import Image

def resize_by_width(image_path, target_width):
    # Open the image
    img = Image.open(image_path)
    
    # Get original dimensions
    original_width, original_height = img.size
    
    # Calculate aspect ratio
    aspect_ratio = original_height / original_width
    
    # Calculate new height based on target width
    new_height = int(target_width * aspect_ratio)
    
    # Resize the image
    resized_img = img.resize((target_width, new_height), Image.LANCZOS)
    
    return resized_img

def remove_background(image_path):
    # Load the image
    image = Image.open(image_path)

    # Convert the image to RGBA mode
    image = image.convert("RGBA")

    # Create a new image with transparent background
    data = image.getdata()
    new_data = []
    for item in data:
        if item[0] == 255 and item[1] == 255 and item[2] == 255:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    image.putdata(new_data) 
    return image

@application.route('/check_planogram', methods=['POST'])
@cache.cached(timeout=0)
def check_planogram():
    print("POST")
    planogram_name = request.form.get('planogram')
    planogram_image = planogram_image_map[planogram_name]
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    if 'shelfImage' in request.form:
        selected_shelf_image = request.form.get('shelfImage')
        selected_shelf_image = selected_shelf_image[selected_shelf_image.rindex('/') + 1: ]
        upload_folder = application.config['UPLOAD_FOLDER']
        filepath = f'{upload_folder}/{selected_shelf_image}'
        
        output_file_path = f'static/output/{str(selected_shelf_image).replace(".", "_annotated.")}'
        output_file_path = output_file_path.replace('.jpg', '.png')
        output_file_path = output_file_path.replace('.jpeg', '.png')
        
        template = cv2.imread(planogram_image)
        comparison = cv2.imread(filepath)
        # Ensure images are the same size
        comparison = cv2.resize(comparison, (template.shape[1], template.shape[0]))
        cv2.imwrite(filepath, comparison)

        remove_background(filepath).save(filepath)
        remove_background(planogram_image).save(planogram_image)

        planogram_compliance.save_planogram_compliance_image(filepath, planogram_image, 'planogram_demo.pt', output_file_path)
        
        remove_background(output_file_path).save(output_file_path)

        upload_file_to_s3(filename=filepath, bucket_name=bucket_name, object_name=filepath)
        upload_file_to_s3(filename=planogram_image, bucket_name=bucket_name, object_name=planogram_image)
        upload_file_to_s3(filename=output_file_path, bucket_name=bucket_name, object_name=output_file_path)
        
        image_data = {
            'planogram': planogram_image,
            'current_shelf': filepath,
            'misplaced_items':output_file_path
        }
        
        download_file_from_s3(bucket_name=bucket_name, object_name=filepath, local_file_path=filepath)
        download_file_from_s3(bucket_name=bucket_name, object_name=planogram_image, local_file_path=planogram_image)
        download_file_from_s3(bucket_name=bucket_name, object_name=output_file_path, local_file_path=output_file_path)

    else:
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'})
        
        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(application.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            template = cv2.imread(planogram_image)
            comparison = cv2.imread(filepath)
            # Ensure images are the same size
            comparison = cv2.resize(comparison, (template.shape[1], template.shape[0]))
            cv2.imwrite(filepath, comparison)
            output_file_path = f'static/output/{str(file.filename).replace(".", "_annotated.")}'
            output_file_path = output_file_path.replace('.jpg', '.png')
            output_file_path = output_file_path.replace('.jpeg', '.png')
            planogram_compliance.save_planogram_compliance_image(filepath, planogram_image, 'planogram_demo.pt', output_file_path)
            
            upload_file_to_s3(filename=filepath, bucket_name=bucket_name, object_name=filepath)
            upload_file_to_s3(filename=planogram_image, bucket_name=bucket_name, object_name=planogram_image)
            upload_file_to_s3(filename=output_file_path, bucket_name=bucket_name, object_name=output_file_path)
            
            image_data = {
                'planogram': planogram_image,
                'current_shelf': filepath,
                'misplaced_items':output_file_path
            }
            
            download_file_from_s3(bucket_name=bucket_name, object_name=filepath, local_file_path=filepath)
            download_file_from_s3(bucket_name=bucket_name, object_name=planogram_image, local_file_path=planogram_image)
            download_file_from_s3(bucket_name=bucket_name, object_name=output_file_path, local_file_path=output_file_path)
            
    return jsonify(image_data)

@application.route('/generate_planogram', methods=['POST'])
@cache.cached(timeout=0)
def generate_planogram():
    print("POST")
    download_file_from_s3(bucket_name=bucket_name, object_name='skewMetadata.json', local_file_path='skewMetadata.json')
    instructions = request.json['instructions']
    selectedLlm = request.json['selectedLlm']
    selectedRules = request.json['selectedRules'].split('~')
    metadata_filename = 'skewMetadata.json'
    planogram_image, explanations = planogram_generation.create_planogram(instructions, selectedRules, metadata_filename, selectedLlm)
    # print(explanations)
    datetime_str = datetime.now().strftime("%Y%m%d%H%M%S")
    output_file_path = f'static/output/planogram_image_{datetime_str}.png'
    max_size = (1000, 1000)
    planogram_image.thumbnail(max_size)
    planogram_image.save(output_file_path)
    upload_file_to_s3(filename=output_file_path, bucket_name=bucket_name, object_name=output_file_path)
    image_data = {
            'planogram_image': output_file_path,
            'explanations': explanations
        }
   
    download_file_from_s3(bucket_name=bucket_name, object_name=output_file_path, local_file_path=output_file_path)
    
    return jsonify(image_data)

@application.route('/check_session')
def check_session():
    if 'request_key' in session:
        secret = session['request_key']
        is_valid_secret = validate_secret(secret)
        print("secret: ", secret, "valid: ", is_valid_secret)
        if is_valid_secret == False:
            return jsonify({'session_active': "false"})
        else:
            return jsonify({'session_active': "true"})
    else:
        return jsonify({'session_active': "false"})
    
if __name__ == '__main__':
    application.run(debug=False, host='0.0.0.0', port=8000)
