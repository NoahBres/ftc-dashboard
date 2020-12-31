import { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import CustomVariable from './CustomVariable';
import BaseView, {
  BaseViewProps,
  BaseViewHeading,
  BaseViewBody,
  BaseViewHeadingProps,
} from './BaseView';
import { ReactComponent as SaveSVG } from '../assets/icons/save.svg';
import { ReactComponent as RefreshSVG } from '../assets/icons/refresh.svg';

import {
  updateConfig,
  saveConfig,
  refreshConfig,
  getModifiedDiff,
} from '../redux/actions/config';
import VariableType from '../enums/VariableType';

type ConfigViewProps = {
  configRoot?: any;
  onRefresh?: any;
  onSave?: any;
  onChange?: any;
} & BaseViewProps &
  BaseViewHeadingProps;

const ConfigView: FunctionComponent<ConfigViewProps> = ({
  configRoot,
  onRefresh,
  onSave,
  onChange,
  isDraggable = false,
  isUnlocked = false,
}: ConfigViewProps) => {
  const sortedKeys = Object.keys(configRoot.__value || {});

  sortedKeys.sort();

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex-center">
        <BaseViewHeading isDraggable={isDraggable}>
          Configuration
        </BaseViewHeading>
        <div className="flex items-center mr-3 space-x-1">
          <button className="icon-btn w-8 h-8">
            <SaveSVG
              className="w-6 h-6"
              onClick={() => onSave(getModifiedDiff(configRoot))}
            />
          </button>
          <button className="icon-btn w-8 h-8">
            <RefreshSVG className="w-6 h-6" onClick={onRefresh} />
          </button>
        </div>
      </div>
      <BaseViewBody>
        <table className="block h-full">
          <tbody>
            {sortedKeys.map((key) => (
              <CustomVariable
                key={key}
                name={key}
                value={configRoot.__value[key].__value || {}}
                onChange={(newValue: any) => {
                  onChange({
                    __type: VariableType.CUSTOM,
                    __value: {
                      [key]: newValue,
                    },
                  });
                }}
                onSave={(newValue: any) => {
                  onSave({
                    __type: VariableType.CUSTOM,
                    __value: {
                      [key]: newValue,
                    },
                  });
                }}
              />
            ))}
          </tbody>
        </table>
      </BaseViewBody>
    </BaseView>
  );
};

ConfigView.propTypes = {
  configRoot: PropTypes.object.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,

  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
};

const mapStateToProps = ({ config }: { config: any }) => config;

const mapDispatchToProps = (dispatch: any) => ({
  onRefresh: () => {
    dispatch(refreshConfig());
  },
  onSave: (configDiff: any) => {
    dispatch(saveConfig(configDiff));
  },
  onChange: (configDiff: any) => {
    dispatch(updateConfig(configDiff));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ConfigView);
