import { Request, Response, NextFunction } from 'express';
import * as notificationsService from './notifications.service';
import { success } from '../../utils/apiResponse';

export const registerToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.body;
    const userId = req.user!.userId;

    const fcmToken = await notificationsService.registerToken({ token, userId });

    res.json(success(fcmToken, 'FCM token registered successfully'));
  } catch (error) {
    next(error);
  }
};
