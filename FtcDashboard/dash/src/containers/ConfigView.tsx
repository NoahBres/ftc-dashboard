import { FunctionComponent } from 'react';
import { useDispatch, useSelector } from 'react-redux';

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
} from '../store/actions/config';
import VariableType from '../enums/VariableType';
import { RootState } from '../store/reducers';
import { Config, ConfigCustom } from '../store/types';

type ConfigViewProps = BaseViewProps & BaseViewHeadingProps;

const ConfigView: FunctionComponent<ConfigViewProps> = ({
  isDraggable = false,
  isUnlocked = false,
}: ConfigViewProps) => {
  const dispatch = useDispatch();
  const configRoot = useSelector((state: RootState) => state.config.configRoot);

  const onRefresh = () => dispatch(refreshConfig());
  const onSave = (configDiff: Config) => dispatch(saveConfig(configDiff));
  const onChange = (configDiff: Config) => dispatch(updateConfig(configDiff));

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
                value={(configRoot as ConfigCustom).__value[key].__value || {}}
                onChange={(newValue: Config) => {
                  onChange({
                    __type: VariableType.CUSTOM,
                    __value: {
                      [key]: newValue,
                    },
                  } as ConfigCustom);
                }}
                onSave={(newValue: Config) => {
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

export default ConfigView;
