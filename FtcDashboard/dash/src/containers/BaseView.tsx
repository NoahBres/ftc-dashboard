import styled from 'styled-components';

export interface BaseViewProps {
  isUnlocked?: boolean;
}

const BaseView = styled.div.attrs<BaseViewProps>(({ isUnlocked = false }) => ({
  className: `h-full pl-4 pt-2 bg-white bg-opacity-75 overflow-hidden transition-shadow ${
    isUnlocked ? 'shadow-md rounded-md select-none' : ''
  }`,
}))<BaseViewProps>``;

export interface BaseViewHeadingProps {
  isDraggable?: boolean;
}

const BaseViewHeading = styled.h2.attrs<BaseViewHeadingProps>(
  ({ isDraggable = false }) => ({
    className: `${
      isDraggable ? 'grab-handle' : ''
    } text-xl w-full py-2 font-medium`,
  }),
)<BaseViewHeadingProps>``;

const BaseViewBody = styled.div`
  height: calc(100% - 52px);
  overflow: auto;
`;

export { BaseView as default, BaseViewHeading, BaseViewBody };
