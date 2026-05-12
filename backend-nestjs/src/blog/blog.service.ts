import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogRepository: Repository<BlogPost>,
  ) {}

  async findAllAdmin() {
    return this.blogRepository.find();
  }

  async findAllPublic() {
    return this.blogRepository.find({ where: { status: 'Published' } });
  }

  async findOne(id: number) {
    return this.blogRepository.findOneBy({ id });
  }

  async create(dto: any) {
    const post = this.blogRepository.create(dto as object);
    return this.blogRepository.save(post);
  }

  async update(id: number, dto: any) {
    const post = await this.findOne(id);
    if (!post) throw new Error('Post not found');
    Object.assign(post, dto);
    return this.blogRepository.save(post);
  }

  async delete(id: number) {
    const post = await this.findOne(id);
    if (post) await this.blogRepository.remove(post);
  }
}
