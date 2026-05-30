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
    console.log(`WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join")
  handleJoinRoom(client: Socket, projectId: string) {
    client.join(`project:${projectId}`);
    client.emit("connected", {
      type: "connected",
      data: { project_id: parseInt(projectId) },
    });
  }

  sendToProject(projectId: number, event: string, data: unknown) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }
}
