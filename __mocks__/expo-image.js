/**
 * Mock for expo-image
 * High-performance image component with caching
 */
const React = require('react');
const { Image: RNImage } = require('react-native');

// Mock Image component
const Image = (props) => {
  const { source, uri, style, contentFit, transition, placeholder, cachePolicy, priority, ...rest } = props;
  
  // Convert expo-image props to RN Image props
  const imageSource = uri ? { uri } : source;
  const resizeMode = contentFit === 'contain' ? 'contain' : 
                     contentFit === 'fill' ? 'stretch' : 
                     contentFit === 'none' ? 'center' : 'cover';
  
  return React.createElement(RNImage, {
    source: imageSource,
    style,
    resizeMode,
    ...rest,
  });
};

// Mock ImageBackground component
const ImageBackground = (props) => {
  const { children, ...imageProps } = props;
  return React.createElement(
    require('react-native').View,
    { style: imageProps.style },
    React.createElement(Image, { ...imageProps, style: require('react-native').StyleSheet.absoluteFill }),
    children
  );
};

module.exports = {
  Image,
  ImageBackground,
};
