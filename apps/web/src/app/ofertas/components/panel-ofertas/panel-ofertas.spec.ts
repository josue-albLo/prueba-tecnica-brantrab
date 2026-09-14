import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelOfertas } from './panel-ofertas';

describe('PanelOfertas', () => {
  let component: PanelOfertas;
  let fixture: ComponentFixture<PanelOfertas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelOfertas],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelOfertas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
