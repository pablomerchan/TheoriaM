import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsesoriaComponent } from './asesoria';

describe('AsesoriaComponent', () => {
  let component: AsesoriaComponent;
  let fixture: ComponentFixture<AsesoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsesoriaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AsesoriaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
