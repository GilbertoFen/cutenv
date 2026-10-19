import { Injectable } from '@nestjs/common';
import { IPacProvider } from './pac-provider.interface';
import { MockSandboxPacAdapter } from './mock-sandbox-pac.adapter';
import { FacturamaPacAdapter } from './facturama-pac.adapter';
import { FiscalConfig } from '../../schemasMongo/fiscal-config.schema';

@Injectable()
export class PacFactory {
  constructor(private readonly mockSandboxPacAdapter: MockSandboxPacAdapter) {}

  getProvider(config?: FiscalConfig): IPacProvider {
    if (!config) {
      return this.mockSandboxPacAdapter;
    }

    if (config.pacProvider === 'facturama' && config.pacUsername && config.pacPasswordEncrypted) {
      return new FacturamaPacAdapter(
        config.pacUsername,
        config.pacPasswordEncrypted,
        config.environment
      );
    }

    // Default: MockSandboxPacAdapter para pruebas locales y cuando no hay credenciales externas
    return this.mockSandboxPacAdapter;
  }
}
