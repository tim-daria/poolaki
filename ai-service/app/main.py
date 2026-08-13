from fastapi import FastAPI

app = FastAPI(title="Poolaki AI Service", version="0.1.0")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
