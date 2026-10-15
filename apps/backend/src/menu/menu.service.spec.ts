import { MenuService } from './menu.service';

describe('MenuService', () => {
  it('does not return menu items from inactive categories', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new MenuService({ menuItem: { findMany } } as never);

    await service.list('tenant-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
        }),
      }),
    );
  });
});
