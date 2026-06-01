import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  namespace: "ws/projects",
  cors: { origin: "*" },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`[WS] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join")
  handleJoinRoom(client: Socket, projectId: string) {
    const room = `project:${projectId}`;
    client.join(room);
    console.log(`[WS] Client ${client.id} joined room ${room}`);
    client.emit("connected", {
      type: "connected",
      data: { project_id: parseInt(projectId) },
    });
  }

  sendToProject(projectId: number, event: string, data: unknown) {
    const room = `project:${projectId}`;
    console.log(`[WS] → emit "${event}" to room ${room}`);
    if (this.server) {
      this.server.to(room).emit(event, data);
    } else {
      console.error(`[WS] Server not initialized! Cannot emit "${event}"`);
    }
  }
}
