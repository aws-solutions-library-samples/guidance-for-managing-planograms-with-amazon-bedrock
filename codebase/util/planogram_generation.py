import boto3
import json
from decimal import Decimal
from PIL import Image, ImageDraw

def genenate_product_metadata():
    dynamodb = boto3.resource('dynamodb')
    # Define the table name
    table_name = readParameterValueFromSSM('/planogram/dynamodb/product_metadata')
    # Fetch data from the merged table
    table = dynamodb.Table(table_name)
    response = table.scan()
    items = response['Items']

    # Continue scanning if there are more items
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])

    # Function to convert Decimal to float
    def decimal_to_float(data):
        if isinstance(data, dict):
            return {k: decimal_to_float(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [decimal_to_float(v) for v in data]
        elif isinstance(data, Decimal):
            return float(data) if str(data).find('.') > -1 else int(data)
        else:
            return data

    # Convert Decimal values to float
    items = [decimal_to_float(item) for item in items]

    # Write the data to a JSON file
    with open('skewMetadata.json', 'w') as json_file:
        json.dump(items, json_file, indent=4)
    
    bucket_name = readParameterValueFromSSM('/planogram/s3/bucket')
    upload_file_to_s3('skewMetadata.json', bucket_name, 'skewMetadata.json')

def upload_file_to_s3(filename, bucket_name, object_name):
    s3_client = boto3.client('s3')
    try:
        with open(filename, 'rb') as file:
            s3_client.upload_fileobj(file, bucket_name, object_name)
        print(f"File uploaded successfully to {bucket_name}/{object_name}")
    except Exception as e:
        print(f"Error uploading file: {e}")

def generate_instructions_from_planogram_rule(selectedRules, metadata, instructions, selectedLlm):
    # Load JSON data from file
    with open("planogramRules.json") as jsonFile:
        planogramRules = json.load(jsonFile)
    # Define the key-value pair to match
    key_to_match = "ruleCode"

    # Function to retrieve all fields for given key and list of values
    def retrieve_all_fields(json_array, key_to_match, values_to_match):
        result = []
        for item in json_array:
            if item.get(key_to_match) in values_to_match:
                result.append(item)
        return result
    retrieved_rules = retrieve_all_fields(planogramRules['planogramRules'], key_to_match, selectedRules)
    
    bedrock = boto3.client('bedrock-runtime')
    system_propmt = f"""Use this product metadata - 
                    \n\n
                    {metadata}
                    \n\n
                    and rules -
                    \n\n
                    {retrieved_rules}
                    \n\n
                    to generate planogram instructions with explanation in json format using the example response - 
                    {{
                    "shelf": {{
                        "rows": <number of rows>,
                        "columns": <number of columns>,
                        "cellQuantity":<maximum quantity in one row and column>
                    }},
                    "placements": [
                        {{
                        "product": "<product name>",
                        "quantity": <quantity>,
                        "row": <row number>,
                        "column": <column number>
                        }},
                        ...
                    ],
                    "explanations": ["<explanation_1>", "<explanation_2>"]
                    }}
                    Do not iterate on placement of products on shelves for one set of planogram rules
                """
    prompt = f"""{instructions if instructions is not None and instructions!='' and len(instructions)>0 else 
                  'Generate an optimum planogram instruction to arrange all products in a 4 by 4 shelf'} 
                {(' based on ' + (', '.join(selectedRules)) + ':') if selectedRules is not None and len(selectedRules)>0 else ''}
                \n\n
                Start the rows and columns at 1. Please do not leave all the cells in an entire row blank, but an individual cell can be blank. Multiple products can exist in a single cell based on the instruction.
                \n\n
                Use this product metadata -
                    \n\n
                    {metadata}
                    \n\n
                    and rules -
                    \n\n
                    {retrieved_rules}
                    \n\n
                    to generate planogram instructions with explanation in json format using the example response - 
                    {{
                    "shelf": {{
                        "rows": <number of rows>,
                        "columns": <number of columns>,
                        "cellQuantity":<Find maximum quantity after scanning all rows and columns>
                    }},
                    "placements": [
                        {{
                        "product": "<product name>",
                        "quantity": <quantity>,
                        "row": <row number>,
                        "column": <column number>
                        }},
                        ...
                    ],
                    "explanations": ["<explanation_1>", "<explanation_2>"]
                    }}
            """
    # print(prompt)
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4000,
        "temperature": 0,
        "system": system_propmt,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    })
    response = bedrock.invoke_model_with_response_stream(
                # modelId='anthropic.claude-3-sonnet-20240229-v1:0',
                # modelId=readParameterValueFromSSM('/planogram/rules/parser/modelId'),
                modelId=selectedLlm,
                body=body
            )
    assistant_message = ''
    for event in response["body"]:
        chunk = json.loads(event["chunk"]["bytes"])
        if "delta" in chunk:
            content = chunk["delta"].get("text", "")
            if assistant_message == '':
                assistant_message = content
            else:
                assistant_message += content
    assistant_message = assistant_message[assistant_message.index('{'): assistant_message.rindex('}')+1]
    # print(assistant_message)
    # Parse the assistant's response to extract the JSON
    try:
        parsed_json = json.loads(assistant_message)
        return parsed_json
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        # print(f"Raw content: {assistant_message}")
        return None

def load_metadata(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def get_max_quantity(parsed_instructions, shelf):
    max_quantity = 0
    sum_quantity = 0
    rows = shelf['rows']
    columns = shelf['columns']  
    for row in range(1, rows+1):
        sum_quantity = 0
        for column in range(1, columns+1):
            for placement in parsed_instructions['placements']:
                if placement['row'] == row and placement['column'] == column:
                    sum_quantity += placement['quantity']
        if sum_quantity > max_quantity:
            max_quantity = sum_quantity
    return max_quantity

# find the image with the smallest width from metadata
def find_smallest_width(metadata):
    narrowest_width = float('inf')
    for item in metadata:
        image = Image.open(item['productImage'])
        if image.width < narrowest_width:
            narrowest_width = image.width
    return narrowest_width

def add_top_margin(product_image, margin_size):
    img = product_image
    # Get the dimensions of the original image
    width, height = img.size
    
    # Create a new image with the increased height
    new_img = Image.new('RGBA', (width, height + margin_size), color=(0,0,0,0))
    
    # Paste the original image onto the new image at an offset
    new_img.paste(img, (0, margin_size))
    
    return new_img

def remove_background(img):
    # Create a white background
    background = Image.new("RGBA", img.size, (0, 0, 0, 0))

    # Paste the image on the background
    composite = Image.alpha_composite(background, img)

    # Convert to RGB
    new_image = composite.convert("RGB")
    return new_image

def create_planogram(instructions, selectedRules, metadata_file, selectedLlm):
    metadata = load_metadata(metadata_file)
    parsed_instructions = generate_instructions_from_planogram_rule(selectedRules, metadata, instructions, selectedLlm)
    if 'explanations' not in parsed_instructions:
        explanations = None
    else:
        explanations = parsed_instructions['explanations']
    # print(parsed_instructions)
    shelf = parsed_instructions['shelf']
    placements = parsed_instructions['placements']
    max_row = 0
    max_column = 0
    # Iterate through placements to find max row and column
    for placement in parsed_instructions['placements']:
        max_row = max(max_row, placement['row'])
        max_column = max(max_column, placement['column'])

    max_quantity = int(shelf["cellQuantity"])
    # print(f'max_quantity: {max_quantity}')
    max_image_width, max_image_height = max(Image.open(p['productImage']).size for p in metadata)
    individual_cell_width, individual_cell_height = int(max_image_width/shelf['columns']), int(max_image_height/shelf['rows'])
    # print('individual cell dimensions: ', individual_cell_width, individual_cell_height)
    cell_width = individual_cell_width * max_quantity
    cell_height = individual_cell_height
    # print('Final cell dimensions: ', cell_width, cell_height)
    img_width = shelf['columns'] * cell_width
    img_height = shelf['rows'] * cell_height
    # print(img_width, img_height)
    img_border_width = 5
    img_border_color = 'gray'  # Red border
    planogram = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(planogram)
    # Draw grid lines
    for i in range(1, shelf['columns']):
        draw.line([(i * cell_width, 0), (i * cell_width, img_height)], fill='gray', width=5)
    for i in range(1, shelf['rows']):
        draw.line([(0, i * cell_height), (img_width, i * cell_height)], fill='gray', width=5)
    
    # Place products
    counter = 0
    temp_coords = (placements[0]['row'], placements[0]['column'])
    temp_product_name = placements[0]['product'].lower()
    for placement in placements:
        product_name = placement['product'].lower()
        product_image_path = next((item['productImage'] for item in metadata if item['product'].lower() in product_name), None)
        
        if product_image_path:
            product_image = Image.open(product_image_path).convert("RGBA", colors=(0,0,0,0))
            # product_image = remove_background(p_img)
            original_width, original_height = product_image.size
            original_aspect_ratio = original_width / original_height         
            if "case" in product_name.lower():
                product_image = product_image.resize((int((individual_cell_height-(individual_cell_height * 0.30)) * original_aspect_ratio), individual_cell_height-((int(individual_cell_height * 0.30)))))
                product_image = add_top_margin(product_image, int((individual_cell_height * 0.30)))
            elif "bottle" in product_name.lower():
                product_image = product_image.resize((int((individual_cell_height-(individual_cell_height * 0.10)) * original_aspect_ratio), individual_cell_height-((int(individual_cell_height * 0.10)))))
                product_image = add_top_margin(product_image, int((individual_cell_height * 0.10)))
            elif "bottle case" in product_name.lower():
                product_image = product_image.resize((int((individual_cell_height-(individual_cell_height * 0.30)) * original_aspect_ratio), individual_cell_height-((int(individual_cell_height * 0.30)))))
                product_image = add_top_margin(product_image, int((individual_cell_height * 0.30)))
            elif "box" in product_name.lower():
                product_image = product_image.resize((int((individual_cell_height-(individual_cell_height * 0.30)) * original_aspect_ratio), individual_cell_height-((int(individual_cell_height * 0.30)))))
                product_image = add_top_margin(product_image, int((individual_cell_height * 0.30)))
            else:
                product_image = product_image.resize((int((individual_cell_height-(individual_cell_height * 0.30)) * original_aspect_ratio), individual_cell_height-((int(individual_cell_height * 0.30)))))
                product_image = add_top_margin(product_image, int((individual_cell_height * 0.30)))
            # product_image = product_image.convert('RGBA', colors=(0,0,0,0))
            # print(f'{product_name} - {product_image.size}')
            
            # Calculate position
            x = (placement['column'] - 1) * cell_width
            y = (placement['row'] - 1) * cell_height
            
            # Paste product images left to right
            if counter == 0:
                offset_x = 0
            elif counter > 0 and temp_coords != (placement['row'], placement['column']):
                offset_x = 0
            cumulative_width = 0
            cumulative_height = 0
            for i in range(placement['quantity']):
                offset_y = (i // max_quantity) * (cell_height // max_quantity)
                cumulative_width += product_image.width
                cumulative_height += product_image.height
                # print(f'{product_name} at {(i, x, offset_x, y, offset_y, product_image.size, original_aspect_ratio)}')
                # print(f'{product_name} at {i, cumulative_width, cumulative_height, cell_width, cell_height}')
                if cumulative_width <= cell_width:
                    planogram.paste(product_image, (x + offset_x, y + offset_y))
                offset_x += product_image.size[0]
        
        if temp_coords != (placement['row'], placement['column']):
            temp_coords = (placement['row'], placement['column'])
        if temp_product_name != product_name:
            temp_product_name = product_name
        counter +=1
    
    # Draw grid lines
    for i in range(1, shelf['columns']):
        draw.line([(i * cell_width, 0), (i * cell_width, img_height)], fill='gray', width=5)
    for i in range(1, shelf['rows']):
        draw.line([(0, i * cell_height), (img_width, i * cell_height)], fill='gray', width=5)
    draw.rectangle([(0, 0), (img_width, img_height)], outline=img_border_color, width=img_border_width)
    # final_aspect_ratio = planogram.size[0]/planogram.size[0]
    # planogram = planogram.resize((500, int(img_width/final_aspect_ratio)))
    return planogram, explanations

def readParameterValueFromSSM(parameter_name):
    ssm_client = boto3.client('ssm')
    response = ssm_client.get_parameter(Name=parameter_name, WithDecryption=True)
    return response['Parameter']['Value']