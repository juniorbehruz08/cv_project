import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .template_choices import RESUME_TEMPLATES
from .views import GUEST_DEMO_SLUGS
from .models import CVDownload


class TemplateAccessTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='template-user',
            password='test-password-123',
        )

    def test_guest_gallery_shows_only_three_demo_templates(self):
        response = self.client.get(reverse('resume:demo'))

        self.assertContains(response, reverse('resume:template_detail', args=['artistic']))
        self.assertContains(response, reverse('resume:template_detail', args=['bloom']))
        self.assertContains(response, reverse('resume:template_detail', args=['timeless']))
        self.assertNotContains(response, reverse('resume:template_detail', args=['impact']))
        self.assertContains(response, 'Unlock all templates')
        self.assertEqual(response.content.count(b'class="template-card"'), 3)

    def test_guest_can_open_demo_without_download_access(self):
        response = self.client.get(reverse('resume:template_detail', args=['artistic']))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Demo mode')
        self.assertNotContains(response, 'onclick="downloadPDF()"')

    def test_guest_is_redirected_from_locked_template(self):
        locked_url = reverse('resume:template_detail', args=['impact'])
        response = self.client.get(locked_url)

        self.assertRedirects(
            response,
            f"{reverse('resume:login')}?next={locked_url}",
            fetch_redirect_response=False,
        )

    def test_registered_user_can_see_and_open_all_templates(self):
        self.client.force_login(self.user)

        gallery_response = self.client.get(reverse('resume:demo'))
        self.assertEqual(
            gallery_response.content.count(b'class="template-card"'),
            len(RESUME_TEMPLATES),
        )

        for template in RESUME_TEMPLATES:
            with self.subTest(slug=template['slug']):
                template_response = self.client.get(
                    reverse('resume:template_detail', args=[template['slug']])
                )
                self.assertEqual(template_response.status_code, 200)
                self.assertContains(template_response, 'onclick="downloadPDF()"')
                self.assertNotContains(template_response, 'Demo mode')

    def test_every_template_has_the_expected_guest_access(self):
        for template in RESUME_TEMPLATES:
            slug = template['slug']
            url = reverse('resume:template_detail', args=[slug])

            with self.subTest(slug=slug):
                response = self.client.get(url)

                if slug in GUEST_DEMO_SLUGS:
                    self.assertEqual(response.status_code, 200)
                    self.assertContains(response, 'Demo mode')
                    self.assertNotContains(response, 'onclick="downloadPDF()"')
                else:
                    self.assertRedirects(
                        response,
                        f"{reverse('resume:login')}?next={url}",
                        fetch_redirect_response=False,
                    )


class CVDownloadSnapshotTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='history-user',
            password='test-password-123',
        )
        self.other_user = get_user_model().objects.create_user(
            username='other-user',
            password='test-password-123',
        )
        self.snapshot_html = (
            '<!doctype html><html><head><style>.resume{color:#111}</style></head>'
            '<body><div class="resume"><h1>Saved Person</h1></div></body></html>'
        )

    def test_record_download_saves_snapshot_and_profile_actions(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse('resume:record_download'),
            data=json.dumps({
                'title': 'Saved Person - Artistic',
                'language': 'uz',
                'template_slug': 'artistic',
                'snapshot_html': self.snapshot_html,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        download = CVDownload.objects.get(user=self.user)
        self.assertEqual(download.template_slug, 'artistic')
        self.assertEqual(download.snapshot_html, self.snapshot_html)
        self.assertEqual(
            response.json()['detail_url'],
            reverse('resume:download_detail', args=[download.pk]),
        )

        profile_response = self.client.get(reverse('resume:profile'))
        self.assertContains(profile_response, reverse('resume:download_snapshot', args=[download.pk]))
        self.assertContains(profile_response, reverse('resume:download_detail', args=[download.pk]))
        self.assertContains(profile_response, f"{reverse('resume:download_detail', args=[download.pk])}?print=1")

    def test_snapshot_and_detail_are_private_to_owner(self):
        download = CVDownload.objects.create(
            user=self.user,
            title='Private CV',
            template_slug='artistic',
            snapshot_html=self.snapshot_html,
        )
        self.client.force_login(self.other_user)

        detail_response = self.client.get(reverse('resume:download_detail', args=[download.pk]))
        snapshot_response = self.client.get(reverse('resume:download_snapshot', args=[download.pk]))

        self.assertEqual(detail_response.status_code, 404)
        self.assertEqual(snapshot_response.status_code, 404)

    def test_snapshot_response_is_script_blocked(self):
        download = CVDownload.objects.create(
            user=self.user,
            title='Safe CV',
            template_slug='artistic',
            snapshot_html=self.snapshot_html,
        )
        self.client.force_login(self.user)

        response = self.client.get(reverse('resume:download_snapshot', args=[download.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Saved Person')
        self.assertIn("default-src 'none'", response['Content-Security-Policy'])
        self.assertEqual(response['X-Frame-Options'], 'SAMEORIGIN')

    def test_invalid_snapshot_payload_is_rejected(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse('resume:record_download'),
            data=json.dumps({
                'template_slug': 'not-a-template',
                'snapshot_html': self.snapshot_html,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(CVDownload.objects.exists())
