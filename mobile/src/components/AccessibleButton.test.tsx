import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleButton } from './AccessibleButton';

describe('AccessibleButton', () => {
  it('should render with label', () => {
    const { getByText } = render(
      <AccessibleButton label="Test Button" onPress={() => {}} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleButton label="Press Me" onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should have correct accessibility label', () => {
    const { getByLabelText } = render(
      <AccessibleButton label="Accessible Button" onPress={() => {}} />
    );
    expect(getByLabelText('Accessible Button')).toBeTruthy();
  });

  it('should have correct accessibility hint', () => {
    const { getByA11yHint } = render(
      <AccessibleButton
        label="Button"
        hint="Double tap to activate"
        onPress={() => {}}
      />
    );
    expect(getByA11yHint('Double tap to activate')).toBeTruthy();
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleButton label="Disabled Button" onPress={onPress} disabled />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    const { getByText } = render(
      <AccessibleButton label="Submit" onPress={() => {}} loading />
    );
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should have button accessibility role', () => {
    const { getByRole } = render(
      <AccessibleButton label="Role Test" onPress={() => {}} />
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('should indicate disabled state in accessibility', () => {
    const { getByRole } = render(
      <AccessibleButton label="Disabled" onPress={() => {}} disabled />
    );
    const button = getByRole('button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should indicate busy state when loading', () => {
    const { getByRole } = render(
      <AccessibleButton label="Loading" onPress={() => {}} loading />
    );
    const button = getByRole('button');
    expect(button.props.accessibilityState?.busy).toBe(true);
  });
});
