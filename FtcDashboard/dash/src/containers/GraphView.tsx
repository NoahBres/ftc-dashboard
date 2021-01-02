import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { RootState } from '../store/reducers';
import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewHeadingProps,
  BaseViewProps,
} from './BaseView';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as ChartSVG } from '../assets/icons/chart.svg';
import { ReactComponent as CloseSVG } from '../assets/icons/close.svg';
import { ReactComponent as PlaySVG } from '../assets/icons/play_arrow.svg';
import { ReactComponent as PauseSVG } from '../assets/icons/pause.svg';

import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';

type GraphViewState = {
  graphing: boolean;
  graphPaused: boolean;
  keys: string[];
  windowMs: {
    value: number;
    valid: boolean;
  };
};

const mapStateToProps = (state: RootState) => ({
  telemetry: state.telemetry,
});

const connector = connect(mapStateToProps);

type GraphViewProps = ConnectedProps<typeof connector> &
  BaseViewProps &
  BaseViewHeadingProps;

class GraphView extends Component<GraphViewProps, GraphViewState> {
  containerRef: React.RefObject<HTMLDivElement>;

  constructor(props: GraphViewProps) {
    super(props);

    this.state = {
      graphing: false,
      graphPaused: false,
      keys: [],
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
    };

    this.containerRef = React.createRef();

    this.handleClick = this.handleClick.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
  }

  componentDidMount() {
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener(
        'keydown',
        this.handleDocumentKeydown,
      );
    }
  }

  componentWillUnmount() {
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener(
        'keydown',
        this.handleDocumentKeydown,
      );
    }
  }

  handleDocumentKeydown(evt: KeyboardEvent) {
    if (evt.code === 'Space' || evt.key === 'k') {
      console.log('bruh');
      this.setState({
        ...this.state,
        graphPaused: !this.state.graphPaused,
      });
    }
  }

  startGraphing() {
    this.setState({
      ...this.state,
      graphing: true,
      graphPaused: false,
    });
  }

  stopGraphing() {
    this.setState({
      ...this.state,
      graphing: false,
    });
  }

  handleClick() {
    if (this.state.graphing) {
      this.stopGraphing();
    } else {
      this.startGraphing();
    }
  }

  render() {
    const { telemetry } = this.props;
    const latestPacket = telemetry[telemetry.length - 1];

    const graphData = telemetry.map((packet) => [
      {
        name: 'time',
        value: packet.timestamp,
      },
      ...Object.keys(packet.data)
        .filter((key) => this.state.keys.includes(key))
        .map((key) => {
          return {
            name: key,
            value: parseFloat(packet.data[key]),
          };
        }),
    ]);

    return (
      <BaseView
        className="flex flex-col overflow-auto"
        isUnlocked={this.props.isUnlocked}
        ref={this.containerRef}
        tabIndex={0}
      >
        <div className="flex-center">
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Graph
          </BaseViewHeading>
          <div className="flex items-center mr-3 space-x-1">
            {this.state.graphing && this.state.keys.length !== 0 ? (
              <button
                onClick={() => {
                  this.setState({
                    ...this.state,
                    graphPaused: !this.state.graphPaused,
                  });
                }}
                className="w-8 h-8 icon-btn"
              >
                {this.state.graphPaused ? (
                  <PlaySVG className="w-6 h-6" />
                ) : (
                  <PauseSVG className="w-6 h-6" />
                )}
              </button>
            ) : null}

            <button onClick={this.handleClick} className="w-8 h-8 icon-btn">
              {this.state.graphing ? (
                <CloseSVG className="w-6 h-6 text-black" />
              ) : (
                <ChartSVG className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
        {this.state.graphing ? (
          <BaseViewBody>
            <div style={{ height: '100%', minHeight: '10rem' }}>
              {this.state.keys.length === 0 ? (
                <div className="absolute top-0 left-0 w-full h-full flex-center pointer-events-none">
                  <p className="text-center">No telemetry selected to graph</p>
                </div>
              ) : (
                <GraphCanvas
                  data={graphData}
                  options={{
                    windowMs: this.state.windowMs.valid
                      ? this.state.windowMs.value
                      : DEFAULT_OPTIONS.windowMs,
                  }}
                  paused={this.state.graphPaused}
                />
              )}
            </div>
          </BaseViewBody>
        ) : Object.keys(latestPacket.data).length > 0 ? (
          <BaseViewBody>
            <p className="text-lg text-center">
              Press the upper-right button to graph selected keys over time
            </p>
            <h3 className="mt-4">Telemetry to graph:</h3>
            <div className="ml-3">
              <MultipleCheckbox
                arr={Object.keys(latestPacket.data).filter(
                  (key) => !isNaN(parseFloat(latestPacket.data[key])),
                )}
                onChange={(selected: string[]) =>
                  this.setState({ keys: selected })
                }
                selected={this.state.keys}
              />
            </div>
            <div style={{ marginTop: '20px' }}>
              <div className="flex justify-between items-center">
                <h3>Options:</h3>
              </div>
              <div className="ml-3">
                <table>
                  <tbody>
                    <tr>
                      <td>Window (ms)</td>
                      <td>
                        <TextInput
                          value={this.state.windowMs.value}
                          valid={this.state.windowMs.valid}
                          validate={validateInt}
                          onChange={({
                            value,
                            valid,
                          }: {
                            value: number;
                            valid: boolean;
                          }) =>
                            this.setState({
                              windowMs: {
                                value,
                                valid,
                              },
                            })
                          }
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </BaseViewBody>
        ) : (
          <div className="flex-grow flex-center">
            <p className="text-center">
              Send number-valued telemetry data to graph them over time
            </p>
          </div>
        )}
      </BaseView>
    );
  }
}

export default connector(GraphView);
