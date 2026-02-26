interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

interface ApiPaginatedResponse<T = any> extends ApiSuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: any[];
}

export const success = <T>(data: T, message = 'Success'): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export const paginated = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiPaginatedResponse<T> => ({
  success: true,
  message: 'Success',
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

export const error = (message: string, errors?: any[]): ApiErrorResponse => ({
  success: false,
  message,
  errors,
});
