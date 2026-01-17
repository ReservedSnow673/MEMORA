import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { Asset } from 'expo-media-library';
import AccessibleText from './AccessibleText';
import {
  createImageAccessibilityLabel,
  formatAccessibleCount,
  useAnnouncement,
} from '../utils/accessibility';

export interface GalleryImage {
  id: string;
  uri: string;
  width: number;
  height: number;
  caption?: string;
  hasCaption: boolean;
  isProcessing: boolean;
  createdAt: Date;
}

interface AccessibleImageGalleryProps {
  images: GalleryImage[];
  onImagePress: (image: GalleryImage) => void;
  onImageLongPress?: (image: GalleryImage) => void;
  numColumns?: number;
  showCaptionIndicator?: boolean;
  emptyMessage?: string;
  testID?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AccessibleImageGallery: React.FC<AccessibleImageGalleryProps> = ({
  images,
  onImagePress,
  onImageLongPress,
  numColumns = 3,
  showCaptionIndicator = true,
  emptyMessage = 'No images found',
  testID,
}) => {
  const announce = useAnnouncement();

  const imageSize = useMemo(() => {
    const spacing = 4 * (numColumns + 1);
    return (SCREEN_WIDTH - spacing) / numColumns;
  }, [numColumns]);

  const handleImagePress = useCallback(
    (image: GalleryImage) => {
      if (image.hasCaption && image.caption) {
        announce(`Selected image. ${image.caption}`);
      } else {
        announce('Selected image without caption');
      }
      onImagePress(image);
    },
    [onImagePress, announce]
  );

  const handleImageLongPress = useCallback(
    (image: GalleryImage) => {
      if (onImageLongPress) {
        announce('Opening options menu');
        onImageLongPress(image);
      }
    },
    [onImageLongPress, announce]
  );

  const renderImage = useCallback(
    ({ item, index }: { item: GalleryImage; index: number }) => {
      const accessibilityLabel = createImageAccessibilityLabel(
        item.caption,
        item.hasCaption,
        item.isProcessing
      );

      return (
        <TouchableOpacity
          style={[styles.imageContainer, { width: imageSize, height: imageSize }]}
          onPress={() => handleImagePress(item)}
          onLongPress={() => handleImageLongPress(item)}
          accessible={true}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={
            item.hasCaption
              ? 'Double tap to view. Long press for options.'
              : 'Double tap to generate caption.'
          }
          accessibilityRole="button"
          accessibilityState={{
            busy: item.isProcessing,
          }}
          testID={`gallery-image-${index}`}
        >
          <Image
            source={{ uri: item.uri }}
            style={styles.image}
            accessible={false}
          />
          {showCaptionIndicator && (
            <View style={styles.indicatorContainer}>
              {item.isProcessing ? (
                <View
                  style={[styles.indicator, styles.processingIndicator]}
                  accessible={false}
                />
              ) : item.hasCaption ? (
                <View
                  style={[styles.indicator, styles.captionedIndicator]}
                  accessible={false}
                />
              ) : (
                <View
                  style={[styles.indicator, styles.uncaptionedIndicator]}
                  accessible={false}
                />
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [imageSize, handleImagePress, handleImageLongPress, showCaptionIndicator]
  );

  const keyExtractor = useCallback((item: GalleryImage) => item.id, []);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <AccessibleText style={styles.emptyText} role="text">
          {emptyMessage}
        </AccessibleText>
      </View>
    ),
    [emptyMessage]
  );

  const ListHeaderComponent = useMemo(() => {
    const captionedCount = images.filter((i) => i.hasCaption).length;
    const uncaptionedCount = images.length - captionedCount;

    return (
      <View
        style={styles.headerContainer}
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={`Image gallery. ${formatAccessibleCount(images.length, 'image')}. ${formatAccessibleCount(captionedCount, 'image')} with caption. ${formatAccessibleCount(uncaptionedCount, 'image')} without caption.`}
      >
        <AccessibleText style={styles.headerText} role="header">
          {images.length} Images
        </AccessibleText>
        <AccessibleText style={styles.subheaderText} role="text">
          {captionedCount} captioned • {uncaptionedCount} need captions
        </AccessibleText>
      </View>
    );
  }, [images]);

  return (
    <FlatList
      data={images}
      renderItem={renderImage}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={styles.container}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={images.length > 0 ? ListHeaderComponent : null}
      showsVerticalScrollIndicator={true}
      accessibilityRole="list"
      accessibilityLabel="Image gallery"
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    flexGrow: 1,
  },
  imageContainer: {
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  captionedIndicator: {
    backgroundColor: '#34C759',
  },
  uncaptionedIndicator: {
    backgroundColor: '#FF3B30',
  },
  processingIndicator: {
    backgroundColor: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  subheaderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default AccessibleImageGallery;
