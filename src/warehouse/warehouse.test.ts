import { describe, expect, it } from "vitest";
import { InMemoryWarehouse } from "./warehouse_data";
import { WarehouseService } from "./warehouse_service";

const bookId = "507f1f77bcf86cd799439011";
const catalogue = {
  findById: async (id: string) =>
    id === bookId
      ? {
          id,
          name: "Test",
          author: "Writer",
          description: "",
          price: 1,
          image: "",
        }
      : null,
};

describe("warehouse domain", () => {
  it("adds multiple deliveries rather than replacing shelf stock", async () => {
    const repo = new InMemoryWarehouse();
    const service = new WarehouseService(repo, catalogue);
    await service.placeBooksOnShelf(bookId, 3, "A");
    await service.placeBooksOnShelf(bookId, 5, "A");
    await service.placeBooksOnShelf(bookId, 2, "B");
    expect(await repo.getCopiesOnShelf(bookId, "A")).toBe(8);
    expect(await service.getStock(bookId)).toBe(10);
    expect(await service.getLocations(bookId)).toEqual([
      { shelf: "A", count: 8 },
      { shelf: "B", count: 2 },
    ]);
  });

  it("defaults stock to zero", async () => {
    const service = new WarehouseService(new InMemoryWarehouse(), catalogue);
    expect(await service.getStock(bookId)).toBe(0);
    expect(await service.getLocations(bookId)).toEqual([]);
  });

  it("does not allow unknown book IDs on incoming stock", async () => {
    const repo = new InMemoryWarehouse();
    const service = new WarehouseService(repo, catalogue);
    await expect(
      service.placeBooksOnShelf("missing", 3, "A"),
    ).rejects.toMatchObject({ status: 404 });
    expect(await repo.getCopies("missing")).toEqual({});
  });

  it.each([0, -1, 1.5, Infinity])(
    "rejects invalid inventory quantity %s",
    async (count) => {
      const service = new WarehouseService(new InMemoryWarehouse(), catalogue);
      await expect(
        service.placeBooksOnShelf(bookId, count, "A"),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
});
