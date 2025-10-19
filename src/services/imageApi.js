const IMAGE_BASE_URL = 'https://njs-01.optimuslab.space/bms';

class ImageAPI {
  // Upload image and return URL
  async uploadImage(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await fetch(`${IMAGE_BASE_URL}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result; // Should contain image URL
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }
}

export default new ImageAPI();