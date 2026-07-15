# def create_user_with_personal_org(email, password):
#     user = User.objects.create_user(email=email, password=password)
#     personal_org = Organization.objects.create(name=f"{user.email}'s budget")
#     Membership.objects.create(user=user, org=personal_org, role="owner")
#     return user
