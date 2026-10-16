import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockTextComponent } from './block-text.component';

describe('BlockTextComponent', () => {
  let fixture: ComponentFixture<BlockTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockTextComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(BlockTextComponent);
  });

  it('deja que Angular sanitice el HTML antes de mostrarlo', () => {
    fixture.componentRef.setInput(
      'payload',
      {
        contenido: '<p>Texto seguro</p><img src="x" onerror="alert(1)"><script>alert(1)</script>'
      }
    );
    fixture.detectChanges();

    const contenido = fixture.nativeElement.querySelector('.text-block') as HTMLElement;
    expect(contenido.textContent).toContain('Texto seguro');
    expect(contenido.querySelector('script')).toBeNull();
    expect(contenido.querySelector('img')?.hasAttribute('onerror')).toBe(false);
  });
});
