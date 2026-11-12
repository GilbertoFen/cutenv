import { Injectable } from '@nestjs/common';
import { IPacProvider } from './pac-provider.interface';
import { MockSandboxPacAdapter } from './mock-sandbox-pac.adapter';
import { FacturamaPacAdapter } from './facturama-pac.adapter';
import { FiscalistoPacAdapter } from './fiscalisto-pac.adapter';
import { FiscalistoService } from '../fiscalisto.service';
import { FiscalConfig } from '../../schemasMongo/fiscal-config.schema';

@Injectable()
export class PacFactory {
  constructor(
    private readonly mockSandboxPacAdapter: MockSandboxPacAdapter,
    private readonly fiscalistoPacAdapter: FiscalistoPacAdapter,
    private readonly fiscalistoService: FiscalistoService
  ) {}

  getProvider(config?: FiscalConfig): IPacProvider {
    // Si Fiscalisto está configurado con FISCALISTO_API_KEY o pacProvider es fiscalisto, usar Fiscalisto
    if (this.fiscalistoService.isConfigured() || config?.pacProvider === 'fiscalisto') {
      return this.fiscalistoPacAdapter;
    }

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

    return this.mockSandboxPacAdapter;
  }
}
