from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import User
from .models import Organization
from .models import Membership
from .models import Goal
from .models import Transaction
from .models import RecurringTransaction
from .models import Category
from .models import ActivityLog


# Create your views here.
def testPage(request):
	if request.method == 'POST':
		print('Received email: ', request.POST['email'])
		print('Received password_hash: ', request.POST['password_hash'])
		print('Received name: ', request.POST['name'])

		User.objects.create(
			email = request.POST['email'],
			password_hash = request.POST['password_hash'],
			name = request.POST['name']
		)
	
	all_user = User.objects.all()

	return render(request, 'poolaki_test.html', {'all_user': all_user})

@login_required
def secret(request):
	return render(request, 'secret.html')