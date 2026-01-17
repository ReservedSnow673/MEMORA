import React from 'react';
import { render } from '@testing-library/react-native';
import AccessibleProgress from '../AccessibleProgress';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.AccessibilityInfo.announceForAccessibility = jest.fn();
  return RN;
});

describe('AccessibleProgress', () => {
  it('should render progress bar', () => {
    const { getByTestId } = render(
      <AccessibleProgress
        current={50}
        total={100}
        testID="progress"
      />
    );

    expect(getByTestId('progress')).toBeTruthy();
  });

  it('should display percentage', () => {
    const { getByText } = render(
      <AccessibleProgress
        current={50}
        total={100}
        showPercentage={true}
      />
    );

    expect(getByText('50%')).toBeTruthy();
  });

  it('should display count', () => {
    const { getByText } = render(
      <AccessibleProgress
        current={25}
        total={100}
        showCount={true}
      />
    );

    expect(getByText('25 / 100')).toBeTruthy();
  });

  it('should display label', () => {
    const { getByText } = render(
      <AccessibleProgress
        current={50}
        total={100}
        label="Processing images"
      />
    );

    expect(getByText('Processing images')).toBeTruthy();
  });

  it('should have correct accessibility value', () => {
    const { getByTestId } = render(
      <AccessibleProgress
        current={75}
        total={100}
        testID="progress"
      />
    );

    const progressBar = getByTestId('progress');
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 75,
      text: '75%',
    });
  });

  it('should have progressbar accessibility role', () => {
    const { getByTestId } = render(
      <AccessibleProgress
        current={50}
        total={100}
        testID="progress"
      />
    );

    const progressBar = getByTestId('progress');
    expect(progressBar.props.accessibilityRole).toBe('progressbar');
  });

  it('should include label in accessibility label', () => {
    const { getByTestId } = render(
      <AccessibleProgress
        current={50}
        total={100}
        label="Uploading"
        testID="progress"
      />
    );

    const progressBar = getByTestId('progress');
    expect(progressBar.props.accessibilityLabel).toContain('Uploading');
  });

  it('should handle zero total', () => {
    const { getByText } = render(
      <AccessibleProgress
        current={0}
        total={0}
        showPercentage={true}
      />
    );

    expect(getByText('0%')).toBeTruthy();
  });

  it('should handle 100% completion', () => {
    const { getByText } = render(
      <AccessibleProgress
        current={100}
        total={100}
        showPercentage={true}
      />
    );

    expect(getByText('100%')).toBeTruthy();
  });

  it('should apply custom colors', () => {
    const { getByTestId } = render(
      <AccessibleProgress
        current={50}
        total={100}
        color="#FF0000"
        backgroundColor="#00FF00"
        testID="progress"
      />
    );

    expect(getByTestId('progress')).toBeTruthy();
  });

  it('should apply custom height', () => {
    const { getByTestId } = render(
      <AccessibleProgress
        current={50}
        total={100}
        height={16}
        testID="progress"
      />
    );

    expect(getByTestId('progress')).toBeTruthy();
  });
});
