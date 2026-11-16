import type {
  NewsItem,
  NewsResponse,
  NewsDetailResponse,
  NewsCreatePayload,
  NewsUpdatePayload,
  NewsCreateResponse,
  NewsUpdateResponse,
  NewsFilters,
} from '@/types/news';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const getAuthHeaders = (token: string) => ({
  token,
});

const getMultipartHeaders = (token: string) => ({
  token,
});

// Get all news items with pagination and filters
export const getAllNews = async (
  token: string,
  filters: NewsFilters = {}
): Promise<NewsResponse> => {
  const queryParams = new URLSearchParams();
  
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.isArchived !== undefined) queryParams.append('isArchived', filters.isArchived.toString());
  if (filters.searchTerm) queryParams.append('searchTerm', filters.searchTerm);
  if (filters.sort) queryParams.append('sort', filters.sort);
  
  const response = await fetch(`${API_URL}/api/news?${queryParams.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to fetch news items');
  }

  return data;
};

// Get user's own news items
export const getMyNews = async (
  token: string,
  filters: NewsFilters = {}
): Promise<NewsResponse> => {
  const queryParams = new URLSearchParams();
  
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.isArchived !== undefined) queryParams.append('isArchived', filters.isArchived.toString());
  if (filters.searchTerm) queryParams.append('searchTerm', filters.searchTerm);
  if (filters.sort) queryParams.append('sort', filters.sort);
  
  const response = await fetch(`${API_URL}/api/news/user/my?${queryParams.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to fetch my news items');
  }

  return data;
};

// Get single news item by ID
export const getNewsById = async (
  token: string,
  id: number
): Promise<NewsDetailResponse> => {
  const response = await fetch(`${API_URL}/api/news/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to fetch news item');
  }

  return data;
};

// Create new news item
export const createNews = async (
  token: string,
  payload: NewsCreatePayload
): Promise<NewsCreateResponse> => {
  const formData = new FormData();
  
  formData.append('title', payload.title);
  formData.append('content', payload.content);
  formData.append('date', payload.date);
  
  if (payload.videoUrl) {
    formData.append('videoUrl', payload.videoUrl);
  }
  
  if (payload.retentionPeriod) {
    formData.append('retentionPeriod', payload.retentionPeriod.toString());
  }
  
  // Add images to form data
  if (payload.images && payload.images.length > 0) {
    payload.images.forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
    });
  }

  const response = await fetch(`${API_URL}/api/news`, {
    method: 'POST',
    headers: getMultipartHeaders(token),
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to create news item');
  }

  return data;
};

// Update existing news item
export const updateNews = async (
  token: string,
  id: number,
  payload: NewsUpdatePayload
): Promise<NewsUpdateResponse> => {
  const formData = new FormData();
  
  if (payload.title) formData.append('title', payload.title);
  if (payload.content) formData.append('content', payload.content);
  if (payload.date !== undefined) formData.append('date', payload.date);
  if (payload.videoUrl !== undefined) formData.append('videoUrl', payload.videoUrl);
  if (payload.retentionPeriod) formData.append('retentionPeriod', payload.retentionPeriod.toString());
  if (payload.isArchived !== undefined) formData.append('isArchived', payload.isArchived.toString());
  
  // Add images to form data if provided
  if (payload.images && payload.images.length > 0) {
    payload.images.forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
    });
  }
  
  // Handle individual image keys (image1, image2, image3, image4)
  for (let i = 1; i <= 4; i++) {
    const imageKey = `image${i}` as keyof NewsUpdatePayload;
    if (payload[imageKey] !== undefined) {
      const imageValue = payload[imageKey];
      if (imageValue === null) {
        // Send empty string to clear the image
        formData.append(imageKey, '');
      } else if (imageValue instanceof File) {
        // Send the file
        formData.append(imageKey, imageValue);
      }
    }
  }

  const response = await fetch(`${API_URL}/api/news/${id}`, {
    method: 'PUT',
    headers: getMultipartHeaders(token),
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to update news item');
  }

  return data;
};

// Delete news item
export const deleteNews = async (
  token: string,
  id: number
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/api/news/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to delete news item');
  }

  return data;
};

// Archive/Unarchive news item
export const toggleArchiveNews = async (
  token: string,
  id: number,
  isArchived: boolean
): Promise<NewsUpdateResponse> => {
  return updateNews(token, id, { isArchived });
};

// Delete specific image from news item
export const deleteNewsImage = async (
  token: string,
  newsItemId: number,
  imageKey: 'image1' | 'image2' | 'image3' | 'image4'
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/api/news/${newsItemId}/${imageKey}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  const data = await response.json();
  
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || data.message || 'Failed to delete image');
  }

  return data;
};
