import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleRadioGroup } from './AccessibleRadioGroup';

const TEST_OPTIONS = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('AccessibleRadioGroup', () => {
  it('should render all options', () => {
    const { getByText } = render(
      <AccessibleRadioGroup
        label="Test Group"
        options={TEST_OPTIONS}
        value="option1"
        onValueChange={() => {}}
      />
    );
    expect(getByText('Option 1')).toBeTruthy();
    expect(getByText('Option 2')).toBeTruthy();
    expect(getByText('Option 3')).toBeTruthy();
  });

  it('should render group label', () => {
    const { getByText } = render(
      <AccessibleRadioGroup
        label="Test Group"
        options={TEST_OPTIONS}
        value="option1"
        onValueChange={() => {}}
      />
    );
    expect(getByText('Test Group')).toBeTruthy();
  });

  it('should call onValueChange with correct value when option pressed', () => {
    const onValueChange = jest.fn();
    const { getByText } = render(
      <AccessibleRadioGroup
        label="Test Group"
        options={TEST_OPTIONS}
        value="option1"
        onValueChange={onValueChange}
      />
    );
    fireEvent.press(getByText('Option 2'));
    expect(onValueChange).toHaveBeenCalledWith('option2');
  });

  it('should have radiogroup accessibility role on container', () => {
    const { getByLabelText } = render(
      <AccessibleRadioGroup
        label="Test Group"
        options={TEST_OPTIONS}
        value="option1"
        onValueChange={() => {}}
      />
    );
    const container = getByLabelText('Test Group');
    expect(container.props.accessibilityRole).toBe('radiogroup');
  });

  it('should have radio accessibility role on options', () => {
    const { getAllByRole } = render(
      <AccessibleRadioGroup
        label="Test Group"
        options={TEST_OPTIONS}
        value="option1"
        onValueChange={() => {}}
      />
    );
    const radios = getAllByRole('radio');
    expect(radios.length).toBe(3);
  });

  it('should indicate selected option in accessibility state', () => {
    const { getAllByRole } = render(
      <AccessibleRadioGroup
        label="Test Group"
        options={TEST_OPTIONS}
        value="option2"
        onValueChange={() => {}}
      />
    );
    const radios = getAllByRole('radio');
    expect(radios[0]?.props.accessibilityState?.checked).toBe(false);
    expect(radios[1]?.props.accessibilityState?.checked).toBe(true);
    expect(radios[2]?.props.accessibilityState?.checked).toBe(false);
  });
});
