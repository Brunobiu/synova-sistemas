// Fila offline simples: guarda mensagens que não puderam ser enviadas e as
// reenvia em ordem quando a conexão volta. Para no primeiro erro (preserva ordem).

export class OfflineQueue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  clear(): void {
    this.items = [];
  }

  /**
   * Tenta enviar os itens em ordem. No primeiro erro, para e mantém os restantes
   * na fila. Retorna quantos foram enviados com sucesso.
   */
  async flush(send: (item: T) => Promise<void>): Promise<number> {
    let sent = 0;
    while (this.items.length > 0) {
      const item = this.items[0];
      try {
        await send(item);
      } catch {
        break;
      }
      this.items.shift();
      sent += 1;
    }
    return sent;
  }
}
