import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccessibleImageGallery, { GalleryImage } from '../AccessibleImageGallery';

const mockImages: GalleryImage[] = [
  {
    id: '1',
    uri: 'file:///test/1.jpg',
    width: 100,
    height: 100,
    caption: 'A sunset over the ocean',
    hasCaption: true,
    isProcessing: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    uri: 'file:///test/2.jpg',
    width: 100,
    height: 100,
    hasCaption: false,
    isProcessing: false,
    createdAt: new Date(),
  },
  {
    id: '3',
    uri: 'file:///test/3.jpg',
    width: 100,
    height: 100,
    hasCaption: false,
    isProcessing: true,
    createdAt: new Date(),
  },
];

describe('AccessibleImageGallery', () => {
  const onImagePress = jest.fn();
  const onImageLongPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render gallery with images', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
        testID="gallery"
      />
    );

    expect(getByTestId('gallery')).toBeTruthy();
  });

  it('should render empty message when no images', () => {
    const { getByText } = render(
      <AccessibleImageGallery
        images={[]}
        onImagePress={onImagePress}
        emptyMessage="No photos to display"
      />
    );

    expect(getByText('No photos to display')).toBeTruthy();
  });

  it('should call onImagePress when image tapped', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
      />
    );

    fireEvent.press(getByTestId('gallery-image-0'));

    expect(onImagePress).toHaveBeenCalledWith(mockImages[0]);
  });

  it('should call onImageLongPress when image long pressed', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
        onImageLongPress={onImageLongPress}
      />
    );

    fireEvent(getByTestId('gallery-image-0'), 'longPress');

    expect(onImageLongPress).toHaveBeenCalledWith(mockImages[0]);
  });

  it('should have correct accessibility labels for captioned images', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
      />
    );

    const image = getByTestId('gallery-image-0');
    expect(image.props.accessibilityLabel).toBe('Image. A sunset over the ocean');
  });

  it('should have correct accessibility labels for uncaptioned images', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
      />
    );

    const image = getByTestId('gallery-image-1');
    expect(image.props.accessibilityLabel).toBe(
      'Image without caption. Double tap to generate caption.'
    );
  });

  it('should have correct accessibility labels for processing images', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
      />
    );

    const image = getByTestId('gallery-image-2');
    expect(image.props.accessibilityLabel).toBe(
      'Image. Caption is being generated.'
    );
  });

  it('should indicate busy state for processing images', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
      />
    );

    const image = getByTestId('gallery-image-2');
    expect(image.props.accessibilityState.busy).toBe(true);
  });

  it('should render header with image counts', () => {
    const { getByText } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
      />
    );

    expect(getByText('3 Images')).toBeTruthy();
    expect(getByText('1 captioned • 2 need captions')).toBeTruthy();
  });

  it('should use custom numColumns', () => {
    const { getByTestId } = render(
      <AccessibleImageGallery
        images={mockImages}
        onImagePress={onImagePress}
        numColumns={4}
        testID="gallery"
      />
    );

    expect(getByTestId('gallery')).toBeTruthy();
  });
});
