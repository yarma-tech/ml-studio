from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from api.datasets import router as datasets_router
from api.training import router as training_router
from api import websocket as ws_manager
from storage.file_manager import cleanup_old_files

app = FastAPI(title="ML Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router)
app.include_router(training_router)

scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_old_files, "interval", hours=1)
scheduler.start()

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.websocket("/ws/training/{training_id}")
async def websocket_endpoint(websocket: WebSocket, training_id: str):
    await ws_manager.connect(websocket, training_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, training_id)
