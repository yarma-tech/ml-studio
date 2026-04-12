FROM python:3.12-slim

WORKDIR /app

ARG CACHEBUST=3
COPY requirements.txt .
RUN pip install --no-cache-dir setuptools>=70.0.0 && pip install --no-cache-dir -r requirements.txt && python -c "import pkg_resources; print('setuptools OK')"

COPY . .

RUN mkdir -p data/uploads data/trained_models

EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
