import { ReactNode, FunctionComponent } from 'react';
import styled from 'styled-components';

import useDelayedTooltip, { ToolTip } from '../../hooks/useDelayedTooltip';

interface RadialFabChildProps {
  customClass?: string;

  fineAdjustIconX?: string;
  fineAdjustIconY?: string;

  angle: number;
  openMargin?: string;

  isOpen?: boolean;

  toolTipText?: string;

  clickEvent?: (e: React.MouseEvent) => void;

  children?: ReactNode;
}

const ButtonContainer = styled.button.attrs<RadialFabChildProps>((props) => ({
  className: `top-1/2 left-1/2 rounded-full outline-none focus:outline-none relative flex-center transition ${props.customClass}`,
}))<RadialFabChildProps>`
  /* Not sure why but removing this breaks the button */
  position: absolute;

  transform: ${({ angle, openMargin, isOpen }) => {
    const displacementX = `calc(${
      isOpen ? Math.cos(angle) : 0
    } * ${openMargin} - 50%)`;
    const displacementY = `calc(${
      isOpen ? Math.sin(angle) : 0
    } * ${openMargin} - 50%)`;

    return `translate(${displacementX}, ${displacementY})`;
  }};

  z-index: -1;
`;

const SVGIcon = styled.div<RadialFabChildProps>`
  transition: transform 300ms ease;

  transform: ${({ fineAdjustIconX, fineAdjustIconY, isOpen }) =>
    `translate(${fineAdjustIconX}, ${fineAdjustIconY}) rotate(${
      isOpen ? 0 : 90
    }deg)`};
`;

const RadialFabChild: FunctionComponent<RadialFabChildProps> = (
  props: RadialFabChildProps,
) => {
  const { isShowingTooltip, ref } = useDelayedTooltip(0.5);

  return (
    <ButtonContainer {...props} onClick={props.clickEvent} ref={ref}>
      <SVGIcon {...props}>{props.children}</SVGIcon>
      {props.toolTipText !== '' ? (
        <ToolTip isShowing={isShowingTooltip}>{props.toolTipText}</ToolTip>
      ) : null}
    </ButtonContainer>
  );
};

RadialFabChild.defaultProps = {
  fineAdjustIconX: '0',
  fineAdjustIconY: '0',

  openMargin: '0',

  toolTipText: '',

  isOpen: false,
};

export default RadialFabChild;
