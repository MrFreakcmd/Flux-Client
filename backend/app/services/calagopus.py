import httpx
from app.config import settings
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class CalagopusClient:
    def __init__(self):
        self.base_url = settings.CALAGOPUS_URL
        
    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": settings.CALAGOPUS_API_KEY,
            "Content-Type": "application/json"
        }

    async def _request(self, method: str, path: str, json_data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> httpx.Response:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.request(method, url, json=json_data, params=params, headers=self.headers, timeout=15)
                return resp
            except Exception as e:
                logger.error(f"Calagopus HTTP Request Exception [{method} {path}]: {e}")
                # Re-raise or return custom mock response for robustness
                raise RuntimeError(f"Failed to communicate with Calagopus panel: {e}")

    # User Management
    async def create_user(self, payload: Dict[str, Any]) -> httpx.Response:
        return await self._request("POST", "/api/admin/users", json_data=payload)

    async def get_user_by_external_id(self, external_id: str) -> httpx.Response:
        return await self._request("GET", f"/api/admin/users/external/{external_id}")

    # Server Management
    async def list_servers(self, page: int = 1, per_page: int = 50) -> httpx.Response:
        return await self._request("GET", "/api/admin/servers", params={"page": page, "per_page": per_page})

    async def get_server(self, server_uuid: str) -> httpx.Response:
        return await self._request("GET", f"/api/admin/servers/{server_uuid}")

    async def create_server(self, payload: Dict[str, Any]) -> httpx.Response:
        return await self._request("POST", "/api/admin/servers", json_data=payload)

    async def update_server(self, server_uuid: str, payload: Dict[str, Any]) -> httpx.Response:
        return await self._request("PATCH", f"/api/admin/servers/{server_uuid}", json_data=payload)

    async def delete_server(self, server_uuid: str) -> httpx.Response:
        return await self._request("DELETE", f"/api/admin/servers/{server_uuid}")

    async def suspend_server(self, server_uuid: str) -> httpx.Response:
        return await self.update_server(server_uuid, {"suspended": True})

    async def unsuspend_server(self, server_uuid: str) -> httpx.Response:
        return await self.update_server(server_uuid, {"suspended": False})

    # Nodes & Allocations
    async def list_nodes(self, page: int = 1, per_page: int = 50) -> httpx.Response:
        return await self._request("GET", "/api/admin/nodes", params={"page": page, "per_page": per_page})

    async def get_node_allocations(self, node_uuid: str, page: int = 1, per_page: int = 100) -> httpx.Response:
        return await self._request("GET", f"/api/admin/nodes/{node_uuid}/allocations", params={"page": page, "per_page": per_page})

    # Client-level Controls (Proxied)
    async def server_power_action(self, server_uuid: str, action: str) -> httpx.Response:
        # action is 'start', 'stop', 'restart', or 'kill'
        return await self._request("POST", f"/api/client/servers/{server_uuid}/power", json_data={"action": action})

    async def get_server_websocket(self, server_uuid: str) -> httpx.Response:
        return await self._request("GET", f"/api/client/servers/{server_uuid}/websocket")

    async def list_server_files(self, server_uuid: str, directory: str = "/") -> httpx.Response:
        return await self._request("GET", f"/api/client/servers/{server_uuid}/files/list", params={"directory": directory})

    async def get_server_backups(self, server_uuid: str) -> httpx.Response:
        return await self._request("GET", f"/api/client/servers/{server_uuid}/backups")

    async def create_server_backup(self, server_uuid: str) -> httpx.Response:
        return await self._request("POST", f"/api/client/servers/{server_uuid}/backups")

    async def delete_server_backup(self, server_uuid: str, backup_uuid: str) -> httpx.Response:
        return await self._request("DELETE", f"/api/client/servers/{server_uuid}/backups/{backup_uuid}")

    async def restore_server_backup(self, server_uuid: str, backup_uuid: str) -> httpx.Response:
        return await self._request("POST", f"/api/client/servers/{server_uuid}/backups/{backup_uuid}/restore")

calagopus_client = CalagopusClient()
