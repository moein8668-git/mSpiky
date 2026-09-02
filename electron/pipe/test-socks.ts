import net from "node:net";

export function testSocksReachable(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(5000);
    socket.once("error", fail);
    socket.once("timeout", () => fail(new Error("Pipe connection timed out.")));
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
  });
}
