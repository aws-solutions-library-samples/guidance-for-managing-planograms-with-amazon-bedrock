import cv2
from ultralytics import YOLO
import math
from PIL import Image

def compare_shelf_images(template_path, comparison_path, model_path):
    print(template_path, ':', comparison_path, ':', model_path)
    # Load YOLOv8 model
    model = YOLO(model_path)

    # Load images
    template = cv2.imread(template_path)
    comparison = cv2.imread(comparison_path)

    # Ensure images are the same size
    comparison = cv2.resize(comparison, (template.shape[1], template.shape[0]))

    # Detect objects in both images
    template_results = model(template)[0]
    comparison_results = model(comparison)[0]
    # print(comparison_results)
    # Create a copy of the comparison image to draw on
    result = comparison.copy()

    # Get class names
    class_names = model.names

    # Find maximum dimensions of objects in the comparison image
    max_width = max_height = 0
    for c_obj in comparison_results.boxes:
        c_box = c_obj.xyxy[0].cpu().numpy().astype(int)
        width = c_box[2] - c_box[0]
        height = c_box[3] - c_box[1]
        max_width = max(max_width, width)
        max_height = max(max_height, height)

    # Compare objects
    for t_obj in template_results.boxes:
        t_class = int(t_obj.cls)
        t_box = t_obj.xyxy[0].cpu().numpy().astype(int)

        matched = False
        current_class = None
        for c_obj in comparison_results.boxes:
            c_class = int(c_obj.cls)
            c_box = c_obj.xyxy[0].cpu().numpy().astype(int)
            # print(f't_class: {t_class} vs c_class: {c_class} and iou: {iou(t_box, c_box)} - {iou(t_box, c_box) > 0.5}')
            if iou(t_box, c_box) > 0.5:
                matched = True
                current_class = c_class
                break

        if not matched or (matched and t_class != current_class):
            # Draw red bounding box around misplaced object using max dimensions
            rectange_border = math.ceil(result.shape[1]/result.shape[0])
            
            # print(f't_class: {t_class} vs current_class: {current_class} : top_position: {top_position} : fixed_bottom_position: {fixed_bottom_position} : max_width: {max_width}')
            
            cv2.rectangle(result, 
                          (t_box[0], t_box[1]), 
                          ((t_box[2]), t_box[3]), 
                          (0, 0, 255), rectange_border)
            
    return result

def iou(box1, box2):
    # Calculate Intersection over Union (IoU)
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0

def compare_shelf_to_planogram(shelf_image_path, planogram_image_path, model_path, output_path):
    template_path = planogram_image_path
    comparison_path = shelf_image_path
    model_path = model_path

    result = compare_shelf_images(template_path, comparison_path, model_path)
    # output_path = output_path.replace('.jpg', '.png').replace('.jpeg', '.png')
    cv2.imwrite(output_path, result)
    Image.open(output_path).convert('RGBA', colors=(0,0,0,0)).save(output_path)

# Example usage
def save_planogram_compliance_image(shelf_image_path, planogram_image_path, model_path, output_path):
    compare_shelf_to_planogram(shelf_image_path, planogram_image_path, model_path, output_path)

if __name__ == "__main__":
    save_planogram_compliance_image('example/shelf_1.png', 'example/template.png', 'axfoodmodel.pt', 'example/plan-shelf_1-comparision-result-1.png')
    save_planogram_compliance_image('example/shelf_2.png', 'example/template.png', 'axfoodmodel.pt', 'example/plan-shelf_2-comparision-result-1.png')
    save_planogram_compliance_image('example/axfood_shelf_1.png', 'example/axfood_planogram.png', 'axfoodmodel.pt', 'example/axfood_planogram-axfood_shelf_1-comparision-result-1.png')
    save_planogram_compliance_image('example/axfood_shelf_2.png', 'example/axfood_planogram.png', 'axfoodmodel.pt', 'example/axfood_planogram-axfood_shelf_2-comparision-result-1.png')