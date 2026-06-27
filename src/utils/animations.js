import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Pulse Animation - Continuous glow effect
 */
export const usePulseAnimation = (duration = 2000) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim, duration]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  return { opacity, scale };
};

/**
 * Slide In Animation - Entry animation from left/right
 */
export const useSlideInAnimation = (fromLeft = true, delay = 0) => {
  const slideAnim = useRef(new Animated.Value(fromLeft ? -100 : 100)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      delay: delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim, delay]);

  return {
    transform: [{ translateX: slideAnim }],
  };
};

/**
 * Fade In Animation
 */
export const useFadeInAnimation = (delay = 0) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, delay]);

  return { opacity: fadeAnim };
};

/**
 * Bounce Animation - For buttons and interactive elements
 */
export const useBounceAnimation = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const bounce = () => {
    bounceAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: -10,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    transform: [{ translateY: bounceAnim }],
    bounce,
  };
};

/**
 * Rotate Animation - Continuous rotation for spinners
 */
export const useRotateAnimation = (duration = 2000) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim, duration]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return { transform: [{ rotate: rotation }] };
};

/**
 * Float Animation - Smooth up-down floating motion
 */
export const useFloatAnimation = (distance = 10, duration = 3000) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, duration]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -distance],
  });

  return { transform: [{ translateY }] };
};

/**
 * Scale Pulse Animation - For progress indicators
 */
export const useScalePulseAnimation = (minScale = 0.8, maxScale = 1.2, duration = 1500) => {
  const scaleAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: maxScale,
          duration: duration / 2,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: minScale,
          duration: duration / 2,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim, minScale, maxScale, duration]);

  return { transform: [{ scale: scaleAnim }] };
};

/**
 * Shimmer Animation - Loading skeleton effect
 */
export const useShimmerAnimation = (duration = 1500) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    ).start();
  }, [shimmerAnim, duration]);

  const backgroundColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['rgba(11, 18, 50, 0.3)', 'rgba(20, 30, 60, 0.5)', 'rgba(11, 18, 50, 0.3)'],
  });

  return { backgroundColor };
};

/**
 * Parallax Animation - For scrolling parallax effects
 */
export const useParallaxAnimation = (scrollYAnimatedValue, inputRange, outputRange) => {
  return scrollYAnimatedValue.interpolate({
    inputRange: inputRange,
    outputRange: outputRange,
    extrapolate: 'clamp',
  });
};
