FROM python:3.9

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN apt-get update && apt-get install -y libgl1-mesa-glx

EXPOSE 8000

CMD ["python", "application.py"]