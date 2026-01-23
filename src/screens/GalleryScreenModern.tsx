/**
 * Modern Gallery Screen
 * Redesigned with dark theme and card-based layout
 * 
 * Performance optimizations:
 * - Memoized render callbacks
 * - FlatList optimizations
 * - Debounced search
 * - Smooth press animations
 */
import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  TextInput,
  Animated,
  Pressable,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { RootState } from '../store';
import { useModernTheme } from '../theme/ThemeContext';
import { ProcessedImage } from '../store/imagesSlice';
import { Card, Badge, SectionHeader, EmptyState, StatusIndicator } from '../components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;
const GRID_ITEM_HEIGHT = CARD_WIDTH * 1.2;
const LIST_ITEM_HEIGHT = 100;

// Memoized Grid Item component
const GridItem = memo(({ 
  item, 
  onPress, 
  styles, 
  theme 
}: { 
  item: ProcessedImage; 
  onPress: () => void;
  styles: any;
  theme: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const dateString = item.creationTime 
    ? new Date(item.creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + new Date(item.creationTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Unknown date';
  
  // Build accessibility label: status first if processing, then description, then date
  let accessibleDescription: string;
  if (item.status === 'processing') {
    accessibleDescription = item.caption 
      ? `Processing. ${item.caption}. ${dateString}`
      : `Processing. No description yet. ${dateString}`;
  } else {
    accessibleDescription = item.caption 
      ? `${item.caption}. ${dateString}`
      : `No description yet. ${dateString}`;
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibleDescription}
      accessibilityHint="Double tap to view image details"
    >
      <Animated.View style={[styles.gridCard, { transform: [{ scale: scaleAnim }] }]}>
        <Image 
          source={{ uri: item.uri }} 
          style={styles.gridImage}
          accessible={false}
          importantForAccessibility="no"
        />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.imageGradient}
          importantForAccessibility="no-hide-descendants"
        />
        
        <View style={styles.statusBadge} importantForAccessibility="no" accessible={false} accessibilityElementsHidden={true}>
          <StatusIndicator status={item.status} accessible={false} />
        </View>

        {item.detailedDescription && (
          <View style={styles.detailedBadge} importantForAccessibility="no">
            <Ionicons name="document-text" size={12} color={theme.colors.textPrimary} />
          </View>
        )}
        
        {item.caption && (
          <View style={styles.captionOverlay} importantForAccessibility="no">
            <Text style={styles.captionText} numberOfLines={2}>
              {item.caption}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});

// Memoized List Item component
const ListItem = memo(({ 
  item, 
  onPress, 
  styles, 
  theme 
}: { 
  item: ProcessedImage; 
  onPress: () => void;
  styles: any;
  theme: any;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const dateString = item.creationTime 
    ? new Date(item.creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + new Date(item.creationTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Unknown date';
  
  // Build accessibility label: status first if processing, then description, then date
  let accessibleDescription: string;
  if (item.status === 'processing') {
    accessibleDescription = item.caption 
      ? `Processing. ${item.caption}. ${dateString}`
      : `Processing. No description yet. ${dateString}`;
  } else {
    accessibleDescription = item.caption 
      ? `${item.caption}. ${dateString}`
      : `No description yet. ${dateString}`;
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibleDescription}
      accessibilityHint="Double tap to view image details"
    >
      <Animated.View style={[styles.listCard, { transform: [{ scale: scaleAnim }] }]}>
        <Image 
          source={{ uri: item.uri }} 
          style={styles.listImage}
          accessible={false}
          importantForAccessibility="no"
        />
        
        <View style={styles.listItemContent} importantForAccessibility="no-hide-descendants" accessible={false}>
          <View style={styles.listHeader}>
            <Text style={styles.listFilename} numberOfLines={1}>
              {item.filename || 'Untitled'}
            </Text>
            <StatusIndicator status={item.status} accessible={false} />
          </View>
          
          {item.caption ? (
            <Text style={styles.listCaption} numberOfLines={2}>
              {item.caption}
            </Text>
          ) : (
            <Text style={styles.listCaptionPlaceholder}>
              No description yet
            </Text>
          )}
          
          <View style={styles.listMeta} importantForAccessibility="no">
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={styles.metaText}>
                {dateString}
              </Text>
            </View>
            {item.detailedDescription && (
              <View style={styles.metaItem}>
                <Ionicons name="document-text-outline" size={12} color={theme.colors.accent} />
                <Text style={[styles.metaText, { color: theme.colors.accent }]}>Detailed</Text>
              </View>
            )}
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </Animated.View>
    </Pressable>
  );
});

interface GalleryScreenProps {
  navigation: any;
}

export default function GalleryScreen({ navigation }: GalleryScreenProps) {
  const images = useSelector((state: RootState) => state.images.items);
  const { theme } = useModernTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Debounced search handler
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 300);
  }, []);

  // Memoized filtered images
  const filteredImages = useMemo(() => {
    if (!debouncedQuery) return images;
    const query = debouncedQuery.toLowerCase();
    return images.filter(image => 
      image.caption?.toLowerCase().includes(query) ||
      image.filename?.toLowerCase().includes(query) ||
      image.detailedDescription?.toLowerCase().includes(query)
    );
  }, [images, debouncedQuery]);

  // Memoized stats
  const { processedImages, pendingImages } = useMemo(() => ({
    processedImages: filteredImages.filter(i => i.status === 'processed'),
    pendingImages: filteredImages.filter(i => i.status !== 'processed'),
  }), [filteredImages]);

  const handleImagePress = useCallback((image: ProcessedImage) => {
    navigation.navigate('ImageDetails', { image });
  }, [navigation]);

  // Memoized render callbacks
  const renderGridItem = useCallback(({ item }: { item: ProcessedImage }) => (
    <GridItem
      item={item}
      onPress={() => handleImagePress(item)}
      styles={styles}
      theme={theme}
    />
  ), [handleImagePress, styles, theme]);

  const renderListItem = useCallback(({ item }: { item: ProcessedImage }) => (
    <ListItem
      item={item}
      onPress={() => handleImagePress(item)}
      styles={styles}
      theme={theme}
    />
  ), [handleImagePress, styles, theme]);

  const keyExtractor = useCallback((item: ProcessedImage) => item.id, []);

  // Layout calculator for getItemLayout optimization
  const getItemLayout = useCallback((data: any, index: number) => {
    if (viewMode === 'grid') {
      return {
        length: GRID_ITEM_HEIGHT,
        offset: GRID_ITEM_HEIGHT * Math.floor(index / 2),
        index,
      };
    }
    return {
      length: LIST_ITEM_HEIGHT,
      offset: LIST_ITEM_HEIGHT * index,
      index,
    };
  }, [viewMode]);

  const renderHeader = () => (
    <View style={styles.headerSection} accessibilityRole="header">
      {/* Title */}
      <View style={styles.titleRow}>
        <View accessible={true} accessibilityRole="text">
          <Text style={styles.title}>Gallery</Text>
          <Text style={styles.subtitle}>Your captioned memories</Text>
        </View>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          accessibilityHint={`Currently in ${viewMode} view. Double tap to change.`}
        >
          <Ionicons 
            name={viewMode === 'grid' ? 'list' : 'grid'} 
            size={22} 
            color={theme.colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by caption or filename..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          accessible={true}
          accessibilityLabel="Search images"
          accessibilityHint="Enter text to search by caption or filename"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery('');
              setDebouncedQuery('');
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow} accessible={false}>
        <Card style={styles.statCard} accessible={true} accessibilityLabel={`${processedImages.length} processed images`}>
          <View 
            style={styles.statIcon}
            accessible={false}
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          </View>
          <Text style={styles.statValue}>{processedImages.length}</Text>
          <Text style={styles.statLabel}>Processed</Text>
        </Card>
        
        <Card style={styles.statCard} accessible={true} accessibilityLabel={`${pendingImages.length} pending images`}>
          <View 
            style={styles.statIcon}
            accessible={false}
          >
            <Ionicons name="time" size={20} color={theme.colors.warning} />
          </View>
          <Text style={styles.statValue}>{pendingImages.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        
        <Card style={styles.statCard} accessible={true} accessibilityLabel={`${filteredImages.length} total images`}>
          <View 
            style={styles.statIcon}
            accessible={false}
          >
            <Ionicons name="images" size={20} color={theme.colors.accent} />
          </View>
          <Text style={styles.statValue}>{filteredImages.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Card>
      </View>

      {searchQuery && (
        <Text style={styles.searchResultsText}>
          {filteredImages.length} result{filteredImages.length !== 1 ? 's' : ''} for "{searchQuery}"
        </Text>
      )}
    </View>
  );

  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHeader()}
        <EmptyState
          icon="images-outline"
          title="No Images Yet"
          subtitle="Add photos to see them here with AI-generated descriptions for accessibility."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        data={filteredImages}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        keyExtractor={keyExtractor}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={viewMode === 'grid' ? 8 : 6}
        windowSize={5}
        initialNumToRender={viewMode === 'grid' ? 8 : 6}
        updateCellsBatchingPeriod={50}
        getItemLayout={viewMode === 'list' ? getItemLayout : undefined}
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.noResultsText}>No images match your search</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
  },
  headerSection: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  viewModeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  searchResultsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 12,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  detailedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,74,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  captionText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listFilename: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  listCaption: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  listCaptionPlaceholder: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  listMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
});
