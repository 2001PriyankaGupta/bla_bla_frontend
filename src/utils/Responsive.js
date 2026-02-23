import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard design screen (iPhone X/11/12/13/14)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * moderateScale
 * @param {number} size 
 * @param {number} factor 
 */
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Responsive Font Size
 * @param {number} size 
 */
const responsiveFontSize = (size) => {
    const newSize = size * (SCREEN_WIDTH / guidelineBaseWidth);
    // Apply a slightly lower factor for scaling fonts to avoid extreme sizes
    const factor = SCREEN_WIDTH > 600 ? 0.6 : 0.85;
    const adjustedSize = size + (newSize - size) * factor;

    if (Platform.OS === 'ios') {
        return Math.round(PixelRatio.roundToNearestPixel(adjustedSize));
    } else {
        // For Android, we avoid the aggressive "- 2" and instead use a more subtle rounding
        return Math.round(PixelRatio.roundToNearestPixel(adjustedSize)) - (SCREEN_WIDTH < 350 ? 0 : 1);
    }
};

const isTablet = SCREEN_WIDTH > 600;

export {
    scale,
    verticalScale,
    moderateScale,
    responsiveFontSize,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    isTablet
};
