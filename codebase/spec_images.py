import cv2
import numpy as np
from ultralytics import YOLO
from scipy.spatial.distance import cdist

def load_and_preprocess_image(image_path):
    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image

def detect_objects(model, image):
    results = model(image)
    return results[0].boxes.xyxy.cpu().numpy(), results[0].boxes.cls.cpu().numpy()

def calculate_center(box):
    return [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2]

def compare_shelf_to_planogram(shelf_image_path, planogram_image_path, model_path, output_path):
    # Load YOLOv8 model
    model = YOLO(model_path)

    # Load images
    shelf_image = load_and_preprocess_image(shelf_image_path)
    planogram_image = load_and_preprocess_image(planogram_image_path)

    # Resize shelf image to match planogram dimensions
    shelf_image = cv2.resize(shelf_image, (planogram_image.shape[1], planogram_image.shape[0]))

    # Detect objects in both images
    shelf_boxes, shelf_classes = detect_objects(model, shelf_image)
    planogram_boxes, planogram_classes = detect_objects(model, planogram_image)

    # Calculate centers of detected objects
    shelf_centers = np.array([calculate_center(box) for box in shelf_boxes])
    planogram_centers = np.array([calculate_center(box) for box in planogram_boxes])

    # Calculate distances between all pairs of centers
    distances = cdist(shelf_centers, planogram_centers)

    # Find closest matches
    shelf_matches = distances.argmin(axis=1)
    planogram_matches = distances.argmin(axis=0)

    # Create a copy of shelf image for visualization
    result_image = shelf_image.copy()

    # Visualize results on the shelf image
    for i, (shelf_box, shelf_class) in enumerate(zip(shelf_boxes, shelf_classes)):
        if i in planogram_matches:
            # Matched product - draw green box
            # color = (0, 255, 0)
            # label = f"Match: Class {shelf_class}"
            continue
        else:
            # Misplaced or extra product - draw red box
            color = (255, 0, 0)
            label = f"Misplaced: Class {shelf_class}"
        
        cv2.rectangle(result_image, (int(shelf_box[0]), int(shelf_box[1])), 
                      (int(shelf_box[2]), int(shelf_box[3])), color, 10)
        cv2.putText(result_image, label, (int(shelf_box[0]), int(shelf_box[1])-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Highlight missing products from planogram
    for i, (planogram_box, planogram_class) in enumerate(zip(planogram_boxes, planogram_classes)):
        if i not in shelf_matches:
            # Missing product - draw yellow dashed box
            color = (0, 0, 255)
            label = f"Missing: Class {planogram_class}"
            
            # Draw dashed rectangle
            pt1 = (int(planogram_box[0]), int(planogram_box[1]))
            pt2 = (int(planogram_box[2]), int(planogram_box[3]))
            dash_length = 10
            for x in range(pt1[0], pt2[0], dash_length):
                cv2.line(result_image, (x, pt1[1]), (min(x+dash_length, pt2[0]), pt1[1]), color, 10)
                cv2.line(result_image, (x, pt2[1]), (min(x+dash_length, pt2[0]), pt2[1]), color, 10)
            for y in range(pt1[1], pt2[1], dash_length):
                cv2.line(result_image, (pt1[0], y), (pt1[0], min(y+dash_length, pt2[1])), color, 10)
                cv2.line(result_image, (pt2[0], y), (pt2[0], min(y+dash_length, pt2[1])), color, 10)
            
            cv2.putText(result_image, label, (int(planogram_box[0]), int(planogram_box[1])-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # cv2.imshow("Shelf Compliance Analysis", cv2.cvtColor(result_image, cv2.COLOR_RGB2BGR))
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    cv2.imwrite(output_path, cv2.cvtColor(result_image, cv2.COLOR_RGB2BGR))

    # Calculate compliance score
    matched_items = len(set(shelf_matches) & set(planogram_matches))
    total_items = len(planogram_boxes)
    compliance_score = (matched_items / total_items) * 100

    print(f"Compliance Score: {compliance_score:.2f}%")
    print(f"Matched Items: {matched_items}")
    print(f"Missing Items: {total_items - matched_items}")
    print(f"Extra Items: {len(shelf_boxes) - matched_items}")

# Example usage
def generate_compliance_image(shelf_image_path, planogram_image_path, model_path, output_path):
    compare_shelf_to_planogram(shelf_image_path, planogram_image_path, model_path, output_path)

shelf_image_path = "shelf-1.jpg"
planogram_image_path = "plano.jpg"
output_path = "comparison_result-1.jpg"
model_path = "yolov8n.pt"  # or path to your custom trained model

generate_compliance_image(shelf_image_path, planogram_image_path, model_path, output_path)