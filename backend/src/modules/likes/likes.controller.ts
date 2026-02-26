import { Request, Response, NextFunction } from 'express';
import * as likesService from './likes.service';
import { success } from '../../utils/apiResponse';

export const toggleLike = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const postId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user!.userId;

    const result = await likesService.toggleLike({ postId, userId });

    res.json(success(result, result.liked ? 'Post liked' : 'Post unliked'));
  } catch (error) {
    next(error);
  }
};
