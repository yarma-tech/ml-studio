import asyncio
from fastapi import WebSocket, WebSocketDisconnect

_connections: dict[str, list[WebSocket]] = {}
_statuses: dict[str, dict] = {}

async def connect(websocket: WebSocket, training_id: str):
    await websocket.accept()
    _connections.setdefault(training_id, []).append(websocket)
    if training_id in _statuses:
        await websocket.send_json(_statuses[training_id])

async def disconnect(websocket: WebSocket, training_id: str):
    if training_id in _connections:
        _connections[training_id] = [ws for ws in _connections[training_id] if ws != websocket]

async def broadcast(training_id: str, data: dict):
    _statuses[training_id] = data
    if training_id not in _connections:
        return
    for ws in _connections[training_id]:
        try:
            await ws.send_json(data)
        except Exception:
            pass

def get_status(training_id: str) -> dict | None:
    return _statuses.get(training_id)

def set_status(training_id: str, data: dict):
    _statuses[training_id] = data
