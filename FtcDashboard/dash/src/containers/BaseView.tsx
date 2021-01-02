import styled from 'styled-components';

export interface BaseViewProps {
  isUnlocked?: boolean;
}

const BaseView = styled.div.attrs<BaseViewProps>((props) => ({
  className: `pl-4 pt-2 bg-white bg-opacity-75 transition-shadow ${
    props.isUnlocked ? 'shadow-md rounded-md select-none' : ''
  }`,
}))<BaseViewProps>`
  height: calc(100% - 1px);
`;

export interface BaseViewHeadingProps {
  isDraggable?: boolean;
}

const BaseViewHeading = styled.h2.attrs<BaseViewHeadingProps>((props) => ({
  className: `${
    props.isDraggable ? 'grab-handle' : ''
  } text-xl w-full py-2 font-medium`,
}))<BaseViewHeadingProps>``;

const BaseViewBody = styled.div`
  height: calc(100% - 52px);
  overflow: auto;
`;

export { BaseView as default, BaseViewHeading, BaseViewBody };
