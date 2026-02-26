import { Request, Response, NextFunction } from 'express';
import * as commentsService from './comments.service';
import { success, paginated } from '../../utils/apiResponse';

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { content } = req.body;
    const userId = req.user!.userId;

    const comment = await commentsService.createComment({
      postId,
      userId,
      content,
    });

    res.status(201).json(success(comment, 'Comment added successfully'));
  } catch (error) {
    next(error);
  }
};

export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await commentsService.getComments({
      postId,
      page,
      limit,
    });

    res.json(
      paginated(
        result.comments,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total
      )
    );
  } catch (error) {
    next(error);
  }
};
