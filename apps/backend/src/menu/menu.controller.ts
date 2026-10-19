import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequireRoles } from '../auth/roles.guard';
import { MenuService } from './menu.service';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto';

type User = { tenantId: string; userId: string };

const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/menu';
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    cb(null, `${randomName}${extname(file.originalname)}`);
  },
});

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post('admin/menu-items/upload')
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Format file harus berupa JPG, PNG, atau WEBP.'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File gambar tidak ditemukan dalam permintaan.');
    }
    const relativeUrl = `/uploads/menu/${file.filename}`;
    return {
      url: relativeUrl,
      filename: file.filename,
      size: file.size,
    };
  }
  
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
    return this.menuService.createItem(user.tenantId, user.userId, {
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
    return this.menuService.updateItem(user.tenantId, user.userId, id, dto); 
  }
  
  @Delete('admin/menu-items/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner'))
  deleteItem(@CurrentUser() user: User, @Param('id') id: string) { 
    return this.menuService.deleteItem(user.tenantId, user.userId, id); 
  }
  
  @Get('admin/menu-categories') 
  @UseGuards(JwtAuthGuard)
  categories(@CurrentUser() user: User) { 
    return this.menuService.categories(user.tenantId); 
  }
  
  @Post('admin/menu-categories') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  createCategory(@CurrentUser() user: User, @Body() dto: CreateMenuCategoryDto) { 
    return this.menuService.createCategory(user.tenantId, user.userId, {
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
    }); 
  }
  
  @Patch('admin/menu-categories/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner', 'manager'))
  updateCategory(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateMenuCategoryDto) { 
    return this.menuService.updateCategory(user.tenantId, user.userId, id, dto); 
  }
  
  @Delete('admin/menu-categories/:id') 
  @UseGuards(JwtAuthGuard, RequireRoles('owner'))
  deleteCategory(@CurrentUser() user: User, @Param('id') id: string) { 
    return this.menuService.deleteCategory(user.tenantId, user.userId, id); 
  }
}
