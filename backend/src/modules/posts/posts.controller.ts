import { Request, Response, NextFunction } from 'express';
import * as postsService from './posts.service';
import { success, paginated } from '../../utils/apiResponse';

export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content } = req.body;
    const authorId = req.user!.userId;

    const post = await postsService.createPost({ content, authorId });
    res.status(201).json(success(post, 'Post created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const username = req.query.username as string | undefined;
    const currentUserId = req.user!.userId;

    const result = await postsService.getPosts({
      page,
      limit,
      username,
      currentUserId,
    });

    res.json(
      paginated(
        result.posts,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      )
    );
  } catch (error) {
    next(error);
  }
};
