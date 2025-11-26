import { PlatformAccessory, CharacteristicValue, Service, WithUUID, Characteristic } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

// UUIDs padrão do HomeKit para características de energia
// Estes são os UUIDs oficiais do HomeKit para Current Consumption e Total Consumption
const CurrentConsumptionUUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
const TotalConsumptionUUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
const ServiceUUID = 'E863F007-079E-48FF-8F27-9C2605A29F52'; // Energy Monitor Service (não é um serviço padrão, mas é usado por dispositivos como Eve Energy)

export class PowerConsumptionService extends BaseService {
  private customService: Service;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding PowerConsumptionService to ${this.name}`);

    // Criar características customizadas para consumo de energia
    this.createCustomCharacteristics();

    // Configurar polling
    let pollSensorsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensorsSeconds = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensorsSeconds > 0 && this.customService) {
      const currentChar = this.customService.getCharacteristic(CurrentConsumptionUUID);
      const totalChar = this.customService.getCharacteristic(TotalConsumptionUUID);
      if (currentChar) {
        multiServiceAccessory.startPollingState(pollSensorsSeconds, this.getCurrentConsumption.bind(this), this.customService,
          currentChar.constructor as WithUUID<typeof Characteristic>);
      }
      if (totalChar) {
        multiServiceAccessory.startPollingState(pollSensorsSeconds, this.getTotalConsumption.bind(this), this.customService,
          totalChar.constructor as WithUUID<typeof Characteristic>);
      }
    }
  }

  private createCustomCharacteristics() {
    // Criar serviço customizado de energia
    // Nota: O HomeKit não tem um serviço padrão de energia, mas tem características padrão
    // Dispositivos como Eve Energy usam um serviço customizado com essas características
    const serviceName = this.componentId === 'main' ? 'Consumo de Energia' : `Consumo de Energia ${this.componentId}`;
    
    // Verificar se já existe o serviço
    let existingService = this.accessory.getService(ServiceUUID);
    if (!existingService) {
      // Criar novo serviço customizado usando a API do Homebridge
      // Usamos o UUID padrão usado por dispositivos de energia compatíveis com HomeKit
      this.customService = new this.platform.api.hap.Service(serviceName, ServiceUUID, 'EnergyMonitor');
      this.accessory.addService(this.customService);
    } else {
      this.customService = existingService;
    }

    this.customService.setCharacteristic(this.platform.Characteristic.Name, serviceName);

    // Criar características padrão do HomeKit para energia
    // Estas são as características oficiais do HomeKit (não customizadas)
    // Característica de potência atual (watts) - UUID padrão do HomeKit
    let currentConsumptionChar = this.customService.getCharacteristic(CurrentConsumptionUUID);
    if (!currentConsumptionChar) {
      // Criar a característica padrão do HomeKit para Current Consumption
      currentConsumptionChar = this.customService.addCharacteristic(
        new this.platform.api.hap.Characteristic('Current Consumption', CurrentConsumptionUUID, {
          format: this.platform.Characteristic.Formats.UINT32,
          perms: [this.platform.Characteristic.Perms.READ, this.platform.Characteristic.Perms.NOTIFY],
          unit: 'W',
          minValue: 0,
          maxValue: 100000,
          minStep: 1,
        })
      );
    }
    currentConsumptionChar.onGet(this.getCurrentConsumption.bind(this));

    // Característica de consumo total acumulado (kWh) - UUID padrão do HomeKit
    let totalConsumptionChar = this.customService.getCharacteristic(TotalConsumptionUUID);
    if (!totalConsumptionChar) {
      // Criar a característica padrão do HomeKit para Total Consumption
      totalConsumptionChar = this.customService.addCharacteristic(
        new this.platform.api.hap.Characteristic('Total Consumption', TotalConsumptionUUID, {
          format: this.platform.Characteristic.Formats.FLOAT,
          perms: [this.platform.Characteristic.Perms.READ, this.platform.Characteristic.Perms.NOTIFY],
          unit: 'kWh',
          minValue: 0,
          maxValue: 1000000,
          minStep: 0.1,
        })
      );
    }
    totalConsumptionChar.onGet(this.getTotalConsumption.bind(this));
  }

  async getCurrentConsumption(): Promise<CharacteristicValue> {
    this.log.debug('Received getCurrentConsumption() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          try {
            // A estrutura do powerConsumptionReport pode variar
            // Tentamos diferentes caminhos possíveis
            const status = this.deviceStatus.status;
            let powerValue = 0;

            if (status.powerConsumptionReport) {
              // Tentar diferentes atributos possíveis
              if (status.powerConsumptionReport.power?.value !== undefined) {
                powerValue = status.powerConsumptionReport.power.value;
              } else if (status.powerConsumptionReport.energy?.value !== undefined) {
                // Se for energia, pode precisar de conversão
                powerValue = status.powerConsumptionReport.energy.value;
              } else if (status.powerConsumptionReport.powerConsumption?.value !== undefined) {
                powerValue = status.powerConsumptionReport.powerConsumption.value;
              } else if (status.powerConsumptionReport.currentPower?.value !== undefined) {
                powerValue = status.powerConsumptionReport.currentPower.value;
              } else {
                // Tentar pegar o primeiro valor numérico encontrado
                const report = status.powerConsumptionReport;
                for (const key in report) {
                  if (report[key]?.value !== undefined && typeof report[key].value === 'number') {
                    powerValue = report[key].value;
                    this.log.debug(`Found power value in ${key}: ${powerValue}`);
                    break;
                  }
                }
              }

              // Converter para watts se necessário (assumindo que pode vir em kW)
              if (powerValue > 0 && powerValue < 1) {
                // Provavelmente está em kW, converter para watts
                powerValue = powerValue * 1000;
              }

              this.log.debug(`Current power consumption from ${this.name}: ${powerValue}W`);
              resolve(Math.round(powerValue));
            } else {
              this.log.warn(`No powerConsumptionReport found in status for ${this.name}`);
              resolve(0);
            }
          } catch (error) {
            this.log.error(`Error getting current consumption from ${this.name}: ${error}`);
            resolve(0);
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  async getTotalConsumption(): Promise<CharacteristicValue> {
    this.log.debug('Received getTotalConsumption() event for ' + this.name);

    return new Promise((resolve, reject) => {
      this.getStatus().then(success => {
        if (success) {
          try {
            const status = this.deviceStatus.status;
            let totalValue = 0;

            if (status.powerConsumptionReport) {
              // Tentar diferentes atributos possíveis para consumo total
              if (status.powerConsumptionReport.energy?.value !== undefined) {
                totalValue = status.powerConsumptionReport.energy.value;
              } else if (status.powerConsumptionReport.totalEnergy?.value !== undefined) {
                totalValue = status.powerConsumptionReport.totalEnergy.value;
              } else if (status.powerConsumptionReport.accumulatedEnergy?.value !== undefined) {
                totalValue = status.powerConsumptionReport.accumulatedEnergy.value;
              } else if (status.powerConsumptionReport.totalConsumption?.value !== undefined) {
                totalValue = status.powerConsumptionReport.totalConsumption.value;
              } else {
                // Tentar pegar o primeiro valor numérico encontrado
                const report = status.powerConsumptionReport;
                for (const key in report) {
                  if (report[key]?.value !== undefined && typeof report[key].value === 'number') {
                    totalValue = report[key].value;
                    this.log.debug(`Found total consumption value in ${key}: ${totalValue}`);
                    break;
                  }
                }
              }

              // Converter para kWh se necessário (assumindo que pode vir em Wh)
              if (totalValue > 1000) {
                // Provavelmente está em Wh, converter para kWh
                totalValue = totalValue / 1000;
              }

              this.log.debug(`Total energy consumption from ${this.name}: ${totalValue}kWh`);
              resolve(Math.round(totalValue * 10) / 10); // Arredondar para 1 decimal
            } else {
              this.log.warn(`No powerConsumptionReport found in status for ${this.name}`);
              resolve(0);
            }
          } catch (error) {
            this.log.error(`Error getting total consumption from ${this.name}: ${error}`);
            resolve(0);
          }
        } else {
          reject(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        }
      });
    });
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating powerConsumptionReport for ${this.name}: ${event.attribute} = ${event.value}`);

    if (this.customService) {
      // Atualizar baseado no atributo do evento
      if (event.attribute === 'power' || event.attribute === 'currentPower' || event.attribute === 'powerConsumption') {
        let value = event.value as number;
        // Converter para watts se necessário
        if (value > 0 && value < 1) {
          value = value * 1000;
        }
        this.customService.updateCharacteristic(CurrentConsumptionUUID, Math.round(value));
      } else if (event.attribute === 'energy' || event.attribute === 'totalEnergy' || event.attribute === 'accumulatedEnergy' || event.attribute === 'totalConsumption') {
        let value = event.value as number;
        // Converter para kWh se necessário
        if (value > 1000) {
          value = value / 1000;
        }
        this.customService.updateCharacteristic(TotalConsumptionUUID, Math.round(value * 10) / 10);
      } else {
        // Se não sabemos qual atributo é, tentar atualizar ambos
        this.getCurrentConsumption().then(v => {
          this.customService!.updateCharacteristic(CurrentConsumptionUUID, v);
        }).catch(() => {});
        this.getTotalConsumption().then(v => {
          this.customService!.updateCharacteristic(TotalConsumptionUUID, v);
        }).catch(() => {});
      }
    }
  }
}

