import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Auction } from './auction';
import { AuctionEventService } from '../../core/services/auction-event.service';
import { AuctionPlayerService } from '../../core/services/auction-player.service';
import { CloudinaryImageService } from '../../core/services/cloudinary-image.service';
import { ImageCacheService } from '../../core/services/image-cache.service';
import { IncrementRuleService } from '../../core/services/increment-rule.service';
import { SponsorsService } from '../../core/services/sponsors.service';
import { TeamService } from '../../core/services/team.service';
import { TournamentService } from '../../core/services/tournament.service';

function createTeam(id: number, name: string) {
  return {
    id,
    name,
    logoUrl: '',
    abbreviation: name.slice(0, 3).toUpperCase(),
  } as any;
}

describe('Auction', () => {
  let component: Auction;
  let fixture: ComponentFixture<Auction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auction],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ tournamentId: '1' }) },
          },
        },
        {
          provide: AuctionPlayerService,
          useValue: {
            getByTournament: () => of([]),
            sell: () => of({}),
            markUnsold: () => of({}),
          },
        },
        {
          provide: AuctionEventService,
          useValue: { notifyAuctionUpdate: () => undefined },
        },
        {
          provide: IncrementRuleService,
          useValue: { getByTournament: () => of([]) },
        },
        {
          provide: TeamService,
          useValue: {
            getByTournament: () => of([]),
            getTeamPurses: () => of([]),
            getTeamPurse: () => of({}),
          },
        },
        {
          provide: TournamentService,
          useValue: { getById: () => of({ date: '2026-01-01', initialIncrementAmount: 5, playersPerTeam: 11 }) },
        },
        {
          provide: ImageCacheService,
          useValue: { cacheImage: () => undefined },
        },
        {
          provide: SponsorsService,
          useValue: { getByTournament: () => of([]) },
        },
        {
          provide: CloudinaryImageService,
          useValue: { getLowQualityPreviewUrl: () => '' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Auction);
    component = fixture.componentInstance;
    component.teams = [
      createTeam(1, 'Team One'),
      createTeam(2, 'Team Two'),
      createTeam(3, 'Team Three'),
    ];
    component.players = [
      {
        id: 1,
        firstName: 'Player',
        lastName: 'One',
        basePrice: 20,
        auctionStatus: 'AVAILABLE',
      } as any,
    ];
    component.currentIndex = 0;
    component.auctionStarted = true;
    component.currentBid = 20;
    component.currentBiddingTeam = null;
  });

  it('should trigger the corresponding team when a numeric key is pressed', () => {
    vi.spyOn(component, 'placeBidForTeam');

    component.handleTeamShortcut('2');

    expect(component.placeBidForTeam).toHaveBeenCalledWith(component.teams[1]);
  });

  it('should map the 0 key to the 10th team and q to the 11th team', () => {
    component.teams = Array.from({ length: 11 }, (_, index) => createTeam(index + 1, `Team ${index + 1}`));

    expect(component.getTeamHotkeyValue(component.teams[9])).toBe('0');
    expect(component.getTeamHotkeyValue(component.teams[10])).toBe('q');
  });

  it('should sell on Enter and unsold on Shift+Enter', () => {
    component.currentBiddingTeam = component.teams[0];
    component.auctionStarted = true;
    component.showSoldOverlay = false;
    component.showUnsoldOverlay = false;

    vi.spyOn(component, 'markSold');
    vi.spyOn(component, 'markUnsold');

    component.onWindowKeydown({ key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault: vi.fn() } as any);
    component.onWindowKeydown({ key: 'Enter', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false, preventDefault: vi.fn() } as any);

    expect(component.markSold).toHaveBeenCalledTimes(1);
    expect(component.markUnsold).toHaveBeenCalledTimes(1);
  });
});
