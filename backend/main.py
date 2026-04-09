from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.datasets import router as datasets_router

app = FastAPI(title="ML Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(datasets_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
