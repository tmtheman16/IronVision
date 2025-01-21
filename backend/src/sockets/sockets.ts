// src/sockets/socket.ts

import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";

const initializeSocket = (server: HTTPServer) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Adjust this as needed for security
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Example event
    socket.on("message", (data: any) => {
      console.log("Message received:", data);
      // Broadcast the message to all clients
      io.emit("message", data);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default initializeSocket;
