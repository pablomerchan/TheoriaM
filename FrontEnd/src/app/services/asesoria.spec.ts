import { TestBed } from '@angular/core/testing';

import { AsesoriaService } from './asesoria';

describe('AsesoriaService', () => {
  let service: AsesoriaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AsesoriaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
