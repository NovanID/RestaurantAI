import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireRoles } from '../auth/roles.guard';
import { MenuService } from './menu.service';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto';

type User = { tenantId: string };

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}
  
  @Get('menu') 
  list(@Query('tenant_id') tenantId: string, @Query('query') query?: string, @Query('category') category?: string) { 
    return this.menuService.list(tenantId, query, category); 
  }
  
  @Get('admin/menu-items') 
  @UseGuards(JwtAuthGuard)
  items(@CurrentUser() user: User) { 
    return this.menuService.adminItems(user.tenantId); 
  }

  @Post('admin/menu-items') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  createItem(@CurrentUser() user: User, @Body() dto: CreateMenuItemDto) { 
    return this.menuService.createItem(user.tenantId, {
      name: dto.name,
      priceIdr: dto.priceIdr,
      categoryId: dto.categoryId,
      description: dto.description,
      imageUrl: dto.imageUrl,
      tags: dto.tags,
    }); 
  }
  
  @Patch('admin/menu-items/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  updateItem(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateMenuItemDto) { 
    return this.menuService.updateItem(user.tenantId, id, dto); 
  }
  
  @Delete('admin/menu-items/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner'))
  deleteItem(@CurrentUser() user: User, @Param('id') id: string) { 
    return this.menuService.deleteItem(user.tenantId, id); 
  }
  
  @Get('admin/menu-categories') 
  @UseGuards(JwtAuthGuard)
  categories(@CurrentUser() user: User) { 
    return this.menuService.categories(user.tenantId); 
  }
  
  @Post('admin/menu-categories') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  createCategory(@CurrentUser() user: User, @Body() dto: CreateMenuCategoryDto) { 
    return this.menuService.createCategory(user.tenantId, {
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
    }); 
  }
  
  @Patch('admin/menu-categories/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  updateCategory(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateMenuCategoryDto) { 
    return this.menuService.updateCategory(user.tenantId, id, dto); 
  }
  
  @Delete('admin/menu-categories/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner'))
  deleteCategory(@CurrentUser() user: User, @Param('id') id: string) { 
    return this.menuService.deleteCategory(user.tenantId, id); 
  }
}
