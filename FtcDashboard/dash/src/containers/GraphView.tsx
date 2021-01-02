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
import { STOP_OP_MODE_TAG } from './types';

type GraphData = [GraphItemTime, ...GraphItem[]];

type GraphItem = {
  name: string;
  value: number;
};

type GraphItemTime = {
  name: 'time';
} & GraphItem;

type GraphViewState = {
  graphing: boolean;
  graphPaused: boolean;

  keys: string[];
  keyCache: string[];

  windowMs: {
    value: number;
    valid: boolean;
  };
  delayMs: {
    value: number;
    valid: boolean;
  };

  graphData: GraphData[];

  shouldShowGraph: boolean;
};

const mapStateToProps = (state: RootState) => ({
  telemetry: state.telemetry,
  status: state.status,
});

const connector = connect(mapStateToProps);

type GraphViewProps = ConnectedProps<typeof connector> &
  BaseViewProps &
  BaseViewHeadingProps;

class GraphView extends Component<GraphViewProps, GraphViewState> {
  containerRef: React.RefObject<HTMLDivElement>;
  graphQueue: GraphData[];

  constructor(props: GraphViewProps) {
    super(props);

    this.state = {
      graphing: false,
      graphPaused: false,

      keys: [],
      keyCache: [],
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
      delayMs: {
        value: DEFAULT_OPTIONS.delayMs,
        valid: true,
      },

      graphData: [],

      shouldShowGraph: false,
    };

    this.graphQueue = [];

    this.containerRef = React.createRef();

    this.handleClick = this.handleClick.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
  }

  componentDidUpdate(prevProps: GraphViewProps) {
    const { telemetry } = this.props;

    if (
      prevProps.status.activeOpMode === STOP_OP_MODE_TAG &&
      this.props.status.activeOpMode !== STOP_OP_MODE_TAG
    ) {
      this.setState({
        ...this.state,
        shouldShowGraph: false,
        keyCache: [],
      });

      return;
    }

    if (telemetry === prevProps.telemetry) return;

    let lastTimeStamp = 0;
    if (telemetry.length > 0) {
      lastTimeStamp = telemetry[telemetry.length - 1].timestamp;
    }

    const newData: GraphData[] = telemetry.map((packet) => [
      {
        name: 'time',
        value: packet.timestamp,
      },
      ...Object.keys(packet.data).map((key) => {
        return {
          name: key,
          value: parseFloat(packet.data[key]),
        };
      }),
    ]);

    this.graphQueue.push(...newData);

    const newItems: GraphData[] = [];

    let newKeyCache: string[] = [];

    for (let i = this.graphQueue.length - 1; i >= 0; i--) {
      if (
        lastTimeStamp - this.graphQueue[i][0].value >
        this.state.delayMs.value
      ) {
        newKeyCache = [
          ...newKeyCache,
          ...this.graphQueue[i]
            .filter(
              (e) =>
                e.name !== 'time' &&
                !this.state.keyCache.includes(e.name) &&
                !newKeyCache.includes(e.name),
            )
            .map((e) => e.name),
        ];

        const filtered = this.graphQueue[i].filter(
          (e) =>
            e.name === 'time' ||
            [...this.state.keys, ...newKeyCache].includes(e.name),
        ) as GraphData;

        if (filtered.length > 1) newItems.push(filtered);

        this.graphQueue.splice(i, 1);
      }
    }

    if (newItems.length !== 0) {
      this.setState({
        ...this.state,
        shouldShowGraph: true,
        graphData: newItems,
        keyCache: [...this.state.keyCache, ...newKeyCache],
      });
    }
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
            {this.state.delayMs.value > 0 && (
              <span className="ml-1 text-neutral-gray-500 text-lg">
                | Delay: {this.state.delayMs.value / 1000}s
              </span>
            )}
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
                  data={this.state.graphData}
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
        ) : this.state.shouldShowGraph ? (
          <BaseViewBody>
            <p className="text-lg text-center">
              Press the upper-right button to graph selected keys over time
            </p>
            <h3 className="mt-4">Telemetry to graph:</h3>
            <div className="ml-3">
              <MultipleCheckbox
                arr={this.state.keyCache}
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
                              ...this.state,
                              windowMs: {
                                value,
                                valid,
                              },
                            })
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Delay (ms)</td>
                      <td>
                        <TextInput
                          value={this.state.delayMs.value}
                          valid={this.state.delayMs.valid}
                          validate={validateInt}
                          onChange={({
                            value,
                            valid,
                          }: {
                            value: number;
                            valid: boolean;
                          }) => {
                            this.graphQueue = [];

                            this.setState({
                              ...this.state,
                              delayMs: {
                                value,
                                valid,
                              },
                              graphData: [],
                            });
                          }}
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
