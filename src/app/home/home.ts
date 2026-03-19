import { Component, OnInit, AfterViewInit, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, AfterViewInit {
  @ViewChildren('animTarget') animTargets!: QueryList<ElementRef>;

  protected readonly Math = Math;

  stats = [
    { label: 'Successful Auctions', value: 156, suffix: '+', current: 0 },
    { label: 'Teams Registered', value: 4200, suffix: '+', current: 0 },
    { label: 'Players Auctioned', value: 28500, suffix: '+', current: 0 },
    { label: 'Organiser Satisfaction', value: 99, suffix: '%', current: 0 },
  ];

  mobileMenuOpen = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Initialize stats display
    this.stats = this.stats.map(stat => ({...stat, current: 0}));
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateStats();
            statsObserver.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) statsObserver.observe(statsSection);
  }

  animateStats() {
    this.stats.forEach((stat) => {
      const duration = 1800;
      const step = stat.value / (duration / 16);
      const timer = setInterval(() => {
        stat.current = Math.min(stat.current + step, stat.value);
        if (stat.current >= stat.value) {
          stat.current = stat.value;
          clearInterval(timer);
        }
      }, 16);
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    this.mobileMenuOpen = false;
  }

  toggleMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }
}
